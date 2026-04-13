export const RAG_CONFIG = {
  chunkSize: 1000,
  chunkOverlap: 200,
  embeddingBatchSize: 20,
  embeddingDimensions: 768,
  maxEmbeddingRetries: 3,
  initialBackoffMs: process.env.NODE_ENV === 'test' ? 1 : 500,
  pineconeUpsertBatchSize: 50,
} as const;
