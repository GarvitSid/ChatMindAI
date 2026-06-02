export const RAG_CONFIG = {
  chunkSize: 1000,
  chunkOverlap: 200,
  embeddingBatchSize: 20,
  embeddingDimensions: 768,
  maxEmbeddingRetries: 3,
  initialBackoffMs: process.env.NODE_ENV === 'test' ? 1 : 500,
  pineconeUpsertBatchSize: 50,
  pineconeDeleteBatchSize: 100,
  // Empirically tuned threshold from Slice 6 benchmark sweep (gemini-embedding-001 at 768 dimensions):
  // Balances 100% in-scope recall and 93.3%-100% Hit@1 source match with 67% zero-quota refusal.
  similarityThreshold: process.env.MIN_SIMILARITY ? parseFloat(process.env.MIN_SIMILARITY) : 0.55,
  topK: 3,
  maxQuestionLength: 1000,
  refusalMessage: 'Relevant information is unavailable in the current knowledge base.',
} as const;
