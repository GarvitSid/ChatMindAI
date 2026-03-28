import dotenv from 'dotenv';

dotenv.config();

const REQUIRED_ENV_VARS = [
  'MONGO_URI',
  'JWT_SECRET',
  'GEMINI_API_KEY',
  'PINECONE_API_KEY',
  'PINECONE_INDEX_NAME',
] as const;

export const validateEnv = (): void => {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]?.trim());

  if (missing.length > 0) {
    throw new Error(
      `[Startup Error] Missing required environment variables:\n  - ${missing.join('\n  - ')}\nPlease check your .env file or deployment configuration.`
    );
  }
};
