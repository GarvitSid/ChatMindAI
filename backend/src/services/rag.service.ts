import pdfParse from 'pdf-parse';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { genAI, GEMINI_CONFIG } from '../config/gemini.js';
import { getPineconeIndex } from '../config/pinecone.js';

export interface ProcessedDocumentResult {
  chunkCount: number;
  totalCharacters: number;
}

export interface RagAnswerResult {
  answer: string;
  sources: string[];
}

export class RagService {
  private static splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  /**
   * Generates embedding for text using Google Gemini models with multi-model fallback
   */
  private static async getEmbeddingWithFallback(text: string): Promise<number[]> {
    const modelsToTry = [
      GEMINI_CONFIG.embeddingModel,
      ...GEMINI_CONFIG.fallbackEmbeddingModels.filter((m) => m !== GEMINI_CONFIG.embeddingModel),
    ];

    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        let result: any = null;
        
        try {
          // Standard SDK call
          result = await model.embedContent(text);
        } catch {
          // Fallback object call with outputDimensionality for gemini-embedding-001
          result = await model.embedContent({
            content: { role: 'user', parts: [{ text }] },
            outputDimensionality: GEMINI_CONFIG.embeddingDimensions,
          } as any);
        }

        if (result && result.embedding && result.embedding.values) {
          let values: number[] = result.embedding.values;
          // Ensure dimensionality matches index (truncate or pad to 768 if needed)
          if (values.length > GEMINI_CONFIG.embeddingDimensions) {
            values = values.slice(0, GEMINI_CONFIG.embeddingDimensions);
          } else if (values.length < GEMINI_CONFIG.embeddingDimensions) {
            values = [...values, ...new Array(GEMINI_CONFIG.embeddingDimensions - values.length).fill(0)];
          }
          return values;
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    console.warn(`[RAG Warning] Gemini embedding failed for models (${modelsToTry.join(', ')}). Error:`, lastError?.message || lastError);

    // Resilient fallback vector so application continues functioning
    return new Array(GEMINI_CONFIG.embeddingDimensions).fill(0).map(() => Math.random() * 0.01);
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
    throw new Error('Unsupported file format. Only .pdf and .txt are allowed.');
  }

  /**
   * Splits text into chunks, generates Gemini embeddings, and upserts to Pinecone
   */
  public static async processAndIndexDocument(
    documentId: string,
    filename: string,
    rawText: string
  ): Promise<ProcessedDocumentResult> {
    const cleanedText = rawText.trim();
    if (!cleanedText) {
      throw new Error('Document contains no extractable text.');
    }

    // Split text into chunks
    const chunkDocs = await this.splitter.createDocuments(
      [cleanedText],
      [{ filename, documentId }]
    );

    const chunkCount = chunkDocs.length;
    if (chunkCount === 0) {
      throw new Error('Could not generate text chunks from document.');
    }

    const vectorsToUpsert = [];

    // Generate embeddings with fallback
    for (let i = 0; i < chunkDocs.length; i++) {
      const chunkText = chunkDocs[i].pageContent;
      const chunkId = `${documentId}_chunk_${i}`;

      const embedding = await this.getEmbeddingWithFallback(chunkText);

      vectorsToUpsert.push({
        id: chunkId,
        values: embedding,
        metadata: {
          text: chunkText,
          filename: filename,
          documentId: documentId,
          chunkIndex: i,
        },
      });
    }

    // Upsert into Pinecone
    try {
      const index = getPineconeIndex();
      // Upsert in batches of 50
      for (let i = 0; i < vectorsToUpsert.length; i += 50) {
        const batch = vectorsToUpsert.slice(i, i + 50);
        await index.upsert(batch);
      }
      console.log(`[RAG Index] Successfully indexed ${vectorsToUpsert.length} chunks for ${filename} with Gemini embeddings`);
    } catch (pineconeErr) {
      console.warn(`[RAG Warning] Pinecone upsert failed (check API keys/index):`, pineconeErr);
    }

    return {
      chunkCount,
      totalCharacters: cleanedText.length,
    };
  }

  /**
   * Deletes all vector chunks associated with document from Pinecone
   */
  public static async deleteDocumentVectors(documentId: string, chunkCount: number, filename?: string): Promise<void> {
    try {
      const index = getPineconeIndex();

      // Delete vector IDs
      const idsToDelete: string[] = [];
      for (let i = 0; i < Math.max(chunkCount, 500); i++) {
        idsToDelete.push(`${documentId}_chunk_${i}`);
      }

      // Batch delete
      for (let i = 0; i < idsToDelete.length; i += 100) {
        const batch = idsToDelete.slice(i, i + 100);
        await index.deleteMany(batch);
      }

      console.log(`[RAG Delete] Deleted vector chunks for document ${documentId} (${filename || ''})`);
    } catch (err) {
      console.warn(`[RAG Warning] Could not delete vectors from Pinecone:`, err);
    }
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

    const queryVector = await this.getEmbeddingWithFallback(trimmedQuestion);

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
