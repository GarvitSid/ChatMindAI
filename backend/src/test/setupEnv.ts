// Environment variables for Jest test environment
process.env.NODE_ENV = 'test';
process.env.PORT = '5001';
process.env.JWT_SECRET = 'test_jwt_secret_key_chatmind_foundation';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/chatmind_test';
process.env.GEMINI_API_KEY = 'test_gemini_api_key_placeholder';
process.env.PINECONE_API_KEY = 'test_pinecone_api_key_placeholder';
process.env.PINECONE_INDEX_NAME = 'chatmind-test-index';
process.env.CLIENT_URL = 'http://localhost:5173';
