import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

dotenv.config();

let pineconeClient: Pinecone | null = null;

export const getPineconeClient = (): Pinecone => {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || '',
    });
    if(!process.env.PINECONE_API_KEY){
     throw new Error('FATAL: Pinecone_API_key is not present')
    }
  }
  return pineconeClient;
};

export const getPineconeIndex = () => {
  const pc = getPineconeClient();
  const indexName = process.env.PINECONE_INDEX_NAME;
  if(!indexName){
     throw new Error('FATAL: indexName is not present')
    }
  return pc.index(indexName);
};
