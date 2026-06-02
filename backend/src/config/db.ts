import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export const connectDB = async (): Promise<void> => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('FATAL: MONGO_URI is not present');
  }

  const timeoutMs = process.env.MONGO_TIMEOUT_MS
    ? parseInt(process.env.MONGO_TIMEOUT_MS, 10)
    : 10000;

  const conn = await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: timeoutMs,
  });
  console.log(`[MongoDB] Connected: ${conn.connection.host}`);
};
