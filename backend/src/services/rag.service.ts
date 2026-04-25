import pdfParse from 'pdf-parse';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { TaskType } from '@google/generative-ai';
import { genAI, GEMINI_CONFIG } from '../config/gemini.js';
import { getPineconeIndex } from '../config/pinecone.js';
import { RAG_CONFIG } from '../config/rag.config.js';

export class IngestionError extends Error {
  public statusCode: number = 502;
  constructor(message: string) {
    super(message);
    this.name = 'IngestionError';
  }
}

export interface ProcessedDocumentResult {
  chunkCount: number;
  totalCharacters: number;
}

export interface RagAnswerResult {
  answer: string;
  sources: string[];
}

/**
 * Normalizes vector using Euclidean (L2) norm.
 * Required when using reduced dimensionality (MRL) to preserve cosine distance geometry.
 */
export const normalizeL2 = (values: number[]): number[] => {
  const norm = Math.sqrt(values.reduce((sum, val) => sum + val * val, 0));
  return norm === 0 ? values : values.map((val) => val / norm);
};

/**
 * Checks whether an error from Google AI API is transient and retryable (rate limits or service outages)
 */
export const isRetryable = (error: any): boolean => {
  const status = error?.status || error?.statusCode;
  if (status === 429 || status === 503) {
    return true;
  }
  const message = error?.message || String(error);
  return (
    message.includes('RESOURCE_EXHAUSTED') ||
    message.includes('UNAVAILABLE') ||
    error?.code === 'ECONNRESET' ||
    error?.code === 'ETIMEDOUT'
  );
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class RagService {
  private static splitter = new RecursiveCharacterTextSplitter({
    chunkSize: RAG_CONFIG.chunkSize,
    chunkOverlap: RAG_CONFIG.chunkOverlap,
  });

  /**
   * Embeds chunks in batches of 20 with exponential backoff on transient errors.
   * Throws IngestionError on complete failure (zero placeholder random vectors).
   */
  public static async batchEmbedChunks(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const allEmbeddings: number[][] = [];
    const model = genAI.getGenerativeModel({ model: GEMINI_CONFIG.embeddingModel });

    for (let i = 0; i < texts.length; i += RAG_CONFIG.embeddingBatchSize) {
      const batch = texts.slice(i, i + RAG_CONFIG.embeddingBatchSize);

      let lastError: any = null;
      let batchSuccess = false;

      for (let attempt = 0; attempt <= RAG_CONFIG.maxEmbeddingRetries; attempt++) {
        try {
          const requests = batch.map((text) => ({
            content: { role: 'user', parts: [{ text }] },
            taskType: TaskType.RETRIEVAL_DOCUMENT,
            outputDimensionality: RAG_CONFIG.embeddingDimensions,
          }));

          const response = await model.batchEmbedContents({ requests });

          if (!response || !response.embeddings || response.embeddings.length !== batch.length) {
            throw new IngestionError(
              `Embedding service returned unexpected result count: expected ${batch.length}, received ${response?.embeddings?.length || 0}`
            );
          }

          for (let j = 0; j < response.embeddings.length; j++) {
            const rawVector = response.embeddings[j]?.values;
            if (!rawVector) {
              throw new IngestionError('Embedding vector values missing in response');
            }

            // Verify strict dimensionality: never pad or truncate silently
            if (rawVector.length !== RAG_CONFIG.embeddingDimensions) {
              throw new IngestionError(
                `Embedding dimension mismatch: expected ${RAG_CONFIG.embeddingDimensions}, received ${rawVector.length}`
              );
            }

            allEmbeddings.push(normalizeL2(rawVector));
          }

          batchSuccess = true;
          break;
        } catch (err: any) {
          lastError = err;
          if (!isRetryable(err) || attempt === RAG_CONFIG.maxEmbeddingRetries) {
            break;
          }
          const backoff = RAG_CONFIG.initialBackoffMs * Math.pow(2, attempt);
          await sleep(backoff);
        }
      }

      if (!batchSuccess) {
        throw new IngestionError(
          `Failed to generate embeddings for batch [${i}..${i + batch.length}]: ${lastError?.message || lastError}`
        );
      }
    }

    return allEmbeddings;
  }

  /**
   * Generates embedding for query text with dimension verification and L2 normalization.
   * Throws on failure; never generates random vectors.
   */
  public static async getEmbeddingForQuery(text: string): Promise<number[]> {
    const model = genAI.getGenerativeModel({ model: GEMINI_CONFIG.embeddingModel });
    try {
      const result = await model.embedContent({
        content: { role: 'user', parts: [{ text }] },
        taskType: TaskType.RETRIEVAL_QUERY,
        outputDimensionality: RAG_CONFIG.embeddingDimensions,
      } as any);

      const values = result?.embedding?.values;
      if (!values || values.length !== RAG_CONFIG.embeddingDimensions) {
        throw new IngestionError(
          `Query embedding dimension mismatch: expected ${RAG_CONFIG.embeddingDimensions}, received ${values?.length || 0}`
        );
      }

      return normalizeL2(values);
    } catch (err: any) {
      if (err instanceof IngestionError) throw err;
      throw new IngestionError(`Failed to generate query embedding: ${err?.message || err}`);
    }
  }

  /**
   * Generates chat response trying configured model, then fallback models
   */
  private static async generateChatWithFallback(systemPrompt: string, userPrompt: string): Promise<string> {
    const modelsToTry = [
      GEMINI_CONFIG.chatModel,
      ...GEMINI_CONFIG.fallbackChatModels.filter((m) => m !== GEMINI_CONFIG.chatModel),
    ];

    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: GEMINI_CONFIG.temperature,
          },
          systemInstruction: systemPrompt,
        });

        const response = await model.generateContent(userPrompt);
        const text = response.response.text()?.trim();
        if (text) {
          return text;
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    console.warn(`[RAG Warning] Gemini chat generation failed across models (${modelsToTry.join(', ')}):`, lastError?.message || lastError);

    if (lastError?.message?.includes('404') || lastError?.status === 404) {
      return "Relevant information is unavailable in the current knowledge base. (Note: Your GEMINI_API_KEY returned a 404 from Google. Please verify that the Generative Language API is enabled for this key in Google AI Studio / Google Cloud).";
    }

    return "Relevant information is unavailable in the current knowledge base.";
  }

  /**
   * Extracts text from in-memory file buffer (PDF or TXT)
   */
  public static async extractTextFromBuffer(buffer: Buffer, mimetype: string, originalname: string): Promise<string> {
    if (mimetype === 'application/pdf' || originalname.toLowerCase().endsWith('.pdf')) {
      const pdfData = await pdfParse(buffer);
      return pdfData.text;
    } else if (
      mimetype === 'text/plain' ||
      originalname.toLowerCase().endsWith('.txt')
    ) {
      return buffer.toString('utf-8');
    }
    const err = new Error('Unsupported file format. Only .pdf and .txt are allowed.');
    (err as any).statusCode = 400;
    throw err;
  }

  /**
   * Splits text into chunks, generates batched Gemini embeddings, and upserts to Pinecone.
   * If any Pinecone upsert fails, executes compensating deletion for uploaded vectors and throws IngestionError.
   */
  public static async processAndIndexDocument(
    documentId: string,
    filename: string,
    rawText: string
  ): Promise<ProcessedDocumentResult> {
    const startTime = Date.now();
    const cleanedText = rawText.trim();
    if (!cleanedText) {
      const err = new Error('Document contains no extractable text.');
      (err as any).statusCode = 400;
      throw err;
    }

    // Split text into chunks
    const chunkDocs = await this.splitter.createDocuments(
      [cleanedText],
      [{ filename, documentId }]
    );

    const chunkCount = chunkDocs.length;
    if (chunkCount === 0) {
      const err = new Error('Could not generate text chunks from document.');
      (err as any).statusCode = 400;
      throw err;
    }

    // Generate embeddings in batches of 20 with retry and dimension verification
    const chunkTexts = chunkDocs.map((c) => c.pageContent);
    const embeddings = await this.batchEmbedChunks(chunkTexts);

    const vectorsToUpsert = [];
    for (let i = 0; i < chunkDocs.length; i++) {
      vectorsToUpsert.push({
        id: `${documentId}_chunk_${i}`,
        values: embeddings[i],
        metadata: {
          text: chunkDocs[i].pageContent,
          filename: filename,
          documentId: documentId,
          chunkIndex: i,
        },
      });
    }

    // Upsert into Pinecone in batches, tracking uploaded IDs for compensating rollback
    const uploadedChunkIds: string[] = [];
    const index = getPineconeIndex();

    try {
      for (let i = 0; i < vectorsToUpsert.length; i += RAG_CONFIG.pineconeUpsertBatchSize) {
        const batch = vectorsToUpsert.slice(i, i + RAG_CONFIG.pineconeUpsertBatchSize);
        await index.upsert(batch);
        uploadedChunkIds.push(...batch.map((v) => v.id));
      }
    } catch (pineconeErr: any) {
      // Compensating Rollback: Clean up any vectors that were partially uploaded
      if (uploadedChunkIds.length > 0) {
        try {
          await index.deleteMany(uploadedChunkIds);
        } catch (cleanupErr) {
          console.error(`[Compensating Rollback Failed] Failed to clean up partial vectors for doc ${documentId}:`, cleanupErr);
        }
      }
      throw new IngestionError(`Pinecone vector indexing failed: ${pineconeErr?.message || pineconeErr}`);
    }

    const elapsedMs = Date.now() - startTime;
    console.log(
      `[RAG Performance] Indexed ${chunkCount} chunks for "${filename}" in ${elapsedMs}ms (${(elapsedMs / chunkCount).toFixed(1)}ms/chunk)`
    );

    return {
      chunkCount,
      totalCharacters: cleanedText.length,
    };
  }

  /**
   * Deletes all vector chunks associated with document from Pinecone using exact chunk IDs.
   * Purges vectors in batches of 100 with exponential backoff retries.
   * If Pinecone deletion fails after retries, logs error and throws IngestionError (502).
   */
  public static async deleteDocumentVectors(documentId: string, chunkCount: number, filename?: string): Promise<void> {
    const count = Math.max(0, chunkCount || 0);
    if (count === 0) {
      console.log(`[RAG Delete] Skipping Pinecone delete for document ${documentId} (0 chunks recorded)`);
      return;
    }

    const idsToDelete: string[] = [];
    for (let i = 0; i < count; i++) {
      idsToDelete.push(`${documentId}_chunk_${i}`);
    }

    const index = getPineconeIndex();
    const batchSize = RAG_CONFIG.pineconeDeleteBatchSize;

    for (let i = 0; i < idsToDelete.length; i += batchSize) {
      const batch = idsToDelete.slice(i, i + batchSize);
      let attempts = 0;
      let success = false;
      let lastError: any = null;

      while (attempts < RAG_CONFIG.maxEmbeddingRetries && !success) {
        try {
          attempts++;
          await index.deleteMany(batch);
          success = true;
        } catch (err: any) {
          lastError = err;
          if (attempts < RAG_CONFIG.maxEmbeddingRetries) {
            const delay = RAG_CONFIG.initialBackoffMs * Math.pow(2, attempts - 1);
            await sleep(delay);
          }
        }
      }

      if (!success) {
        console.error(
          `[RAG Delete Error] Failed to delete vector batch [${i}..${i + batch.length - 1}] for document ${documentId} (${filename || ''}):`,
          lastError
        );
        throw new IngestionError('Failed to remove document vectors. The document was kept so you can retry.');
      }
    }

    console.log(`[RAG Delete] Deleted ${idsToDelete.length} vector chunks for document ${documentId} (${filename || ''})`);
  }

  /**
   * Retrieves relevant context and generates answers using Gemini API and strict system prompt
   */
  public static async answerQuestion(question: string): Promise<RagAnswerResult> {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      return {
        answer: 'Please provide a valid question.',
        sources: [],
      };
    }

    const queryVector = await this.getEmbeddingForQuery(trimmedQuestion);

    // Query Pinecone for top-3 most similar chunks
    let retrievedChunks: { text: string; filename: string }[] = [];
    try {
      const index = getPineconeIndex();
      const queryResponse = await index.query({
        vector: queryVector,
        topK: 3,
        includeMetadata: true,
      });

      if (queryResponse.matches && queryResponse.matches.length > 0) {
        retrievedChunks = queryResponse.matches
          .filter((match) => match.metadata && match.metadata.text)
          .map((match) => ({
            text: String(match.metadata?.text || ''),
            filename: String(match.metadata?.filename || 'Document'),
          }));
      }
    } catch (pineErr) {
      console.warn(`[RAG Warning] Pinecone retrieval failed:`, pineErr);
    }

    // Build context
    const contextText = retrievedChunks.length > 0
      ? retrievedChunks.map((c, idx) => `[Chunk ${idx + 1} from ${c.filename}]:\n${c.text}`).join('\n\n')
      : 'No matching documents found in the knowledge base.';

    // Extract unique source filenames
    const uniqueSources = Array.from(new Set(retrievedChunks.map((c) => c.filename))).filter(Boolean);

    const systemPrompt = `You are a helpful college assistant for ChatMind AI College. Answer the user's question ONLY using the provided Context. Do not use outside knowledge. If the answer is not contained in the Context, explicitly state: 'Relevant information is unavailable in the current knowledge base.' Be concise.`;

    const userPrompt = `Context:\n${contextText}\n\nQuestion: ${trimmedQuestion}\n\nAnswer:`;

    const answer = await this.generateChatWithFallback(systemPrompt, userPrompt);

    return {
      answer,
      sources: uniqueSources,
    };
  }
}
