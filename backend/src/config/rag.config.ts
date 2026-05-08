export const RAG_CONFIG = {
  chunkSize: 1000,
  chunkOverlap: 200,
  embeddingBatchSize: 20,
  embeddingDimensions: 768,
  maxEmbeddingRetries: 3,
  initialBackoffMs: process.env.NODE_ENV === 'test' ? 1 : 500,
  pineconeUpsertBatchSize: 50,
  pineconeDeleteBatchSize: 100,
  // Provisional threshold: matches below this cosine similarity are discarded.
  // To be empirically evaluated and tuned in Slice 6.
  similarityThreshold: process.env.MIN_SIMILARITY ? parseFloat(process.env.MIN_SIMILARITY) : 0.50,
  topK: 3,
  maxQuestionLength: 1000,
  refusalMessage: 'Relevant information is unavailable in the current knowledge base.',
} as const;
