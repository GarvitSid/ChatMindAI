import dotenv from 'dotenv';
import app from './app.js';
import { validateEnv } from './config/env.js';
import { connectDB } from './config/db.js';

dotenv.config();

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const startServer = async () => {
  try {
    // 1. Validate environment configuration
    validateEnv();

    // 2. Connect to database
    await connectDB();

    // 3. Start listening
    app.listen(PORT, () => {
      console.log(`[Server] ChatMind AI College API running on http://localhost:${PORT}`);
      console.log(`[Server] CORS configured for: ${CLIENT_URL}`);
    });
  } catch (error) {
    console.error('[Server Startup Failure]', error);
    process.exit(1);
  }
};

startServer();
