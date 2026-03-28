import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

dotenv.config();

let pineconeClient: Pinecone | null = null;

export const getPineconeClient = (): Pinecone => {
  if (!pineconeClient) {
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) {
      throw new Error('FATAL: PINECONE_API_KEY is not present');
    }
    pineconeClient = new Pinecone({ apiKey });
  }
  return pineconeClient;
};

export const getPineconeIndex = () => {
  const pc = getPineconeClient();
  const indexName = process.env.PINECONE_INDEX_NAME;
  if (!indexName) {
    throw new Error('FATAL: PINECONE_INDEX_NAME is not present');
  }
  return pc.index(indexName);
};
