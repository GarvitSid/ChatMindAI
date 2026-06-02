import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

export const genAI = new GoogleGenerativeAI(apiKey || 'unconfigured-gemini-key');

export const GEMINI_CONFIG = {
  chatModel: process.env.GEMINI_CHAT_MODEL || 'gemini-3.8-flash',
  embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001',
  fallbackEmbeddingModels: ['gemini-embedding-001'],
  fallbackChatModels: [
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash',
  ],
  embeddingDimensions: 768,
  temperature: 0.2,
};
