import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

if(!apiKey){
     throw new Error('FATAL: GEMINI_apiKey is not present')
    }

export const genAI = new GoogleGenerativeAI(apiKey);

export const GEMINI_CONFIG = {
  chatModel: process.env.GEMINI_CHAT_MODEL || 'gemini-3.5-flash',
  embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001',
  fallbackEmbeddingModels: ['gemini-embedding-001'],
  fallbackChatModels: ['gemini-3.5-flash-lite', 'gemini-3.5-flash'],
  embeddingDimensions: 768,
  temperature: 0.2,
};
