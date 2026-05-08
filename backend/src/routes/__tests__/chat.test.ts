import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import app from '../../app.js';
import { connectTestDB, clearTestDB, closeTestDB } from '../../test/dbHelper.js';
import { User } from '../../models/User.js';
import { ChatSession } from '../../models/ChatSession.js';
import { ChatMessage } from '../../models/ChatMessage.js';
import * as pineconeConfig from '../../config/pinecone.js';
import * as geminiConfig from '../../config/gemini.js';

jest.setTimeout(30000);

let studentToken: string;
let studentUserId: mongoose.Types.ObjectId;
let otherUserToken: string;

beforeAll(async () => {
  await connectTestDB();
});

afterEach(async () => {
  await clearTestDB();
  jest.restoreAllMocks();
});

afterAll(async () => {
  await closeTestDB();
});

const setupUsers = async () => {
  const secret = process.env.JWT_SECRET || 'test_jwt_secret_key_chatmind_foundation';

  const student = await User.create({
    name: 'Student Learner',
    email: 'student.chat@chatmind.edu',
    password: 'HashedPassword123',
    role: 'student',
  });
  studentUserId = student._id;
  studentToken = jwt.sign(
    { userId: student._id.toString(), email: student.email, role: 'student' },
    secret,
    { expiresIn: '1d' }
  );

  const otherUser = await User.create({
    name: 'Other Student',
    email: 'other.chat@chatmind.edu',
    password: 'HashedPassword123',
    role: 'student',
  });
  otherUserToken = jwt.sign(
    { userId: otherUser._id.toString(), email: otherUser.email, role: 'student' },
    secret,
    { expiresIn: '1d' }
  );
};

// Helper to provide a standard 768-dim mock vector for query embeddings
const mockQueryEmbedding = () => {
  const mockValues = Array(768).fill(0.036);
  jest.spyOn(geminiConfig.genAI, 'getGenerativeModel').mockImplementation((config: any) => {
    if (config?.model?.includes('embedding')) {
      return {
        embedContent: jest.fn().mockResolvedValue({
          embedding: { values: mockValues },
        }),
      } as any;
    }
    return {
      generateContent: jest.fn().mockResolvedValue({
        response: { text: () => 'Standard answer from Gemini' },
      }),
    } as any;
  });
};

describe('Slice 4: Grounded Question Answering & Retrieval Gating', () => {
  it('Test 1: should reject unauthenticated chat request with 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/chat/ask')
      .send({ message: 'What are the admission requirements?' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('Test 2: should reject empty or whitespace-only question with 400 Bad Request', async () => {
    await setupUsers();

    const res = await request(app)
      .post('/api/chat/ask')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ message: '    ' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('required');
  });

  it('Test 3: should reject question exceeding 1000 characters with 400 Bad Request', async () => {
    await setupUsers();
    const oversizedMessage = 'a'.repeat(1001);

    const res = await request(app)
      .post('/api/chat/ask')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ message: oversizedMessage });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('1000');
  });

  it('Test 4: should reject malformed sessionId with 404 Not Found before calling RAG', async () => {
    await setupUsers();
    const mockEmbed = jest.fn();
    jest.spyOn(geminiConfig.genAI, 'getGenerativeModel').mockReturnValue({
      embedContent: mockEmbed,
    } as any);

    const res = await request(app)
      .post('/api/chat/ask')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ sessionId: 'invalid-hex-123', message: 'Hello' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Chat session not found');

    // Crucial check: never called embedding model
    expect(mockEmbed).not.toHaveBeenCalled();
  });

  it('Test 5: should reject foreign sessionId with 404 Not Found before calling RAG', async () => {
    await setupUsers();

    // Create session owned by otherUser
    const foreignSession = await ChatSession.create({
      userId: new mongoose.Types.ObjectId(),
      title: 'Foreign Session',
    });

    const mockEmbed = jest.fn();
    jest.spyOn(geminiConfig.genAI, 'getGenerativeModel').mockReturnValue({
      embedContent: mockEmbed,
    } as any);

    const res = await request(app)
      .post('/api/chat/ask')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ sessionId: foreignSession._id.toString(), message: 'Hello foreign session' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Chat session not found');

    // Never called embedding model
    expect(mockEmbed).not.toHaveBeenCalled();
  });

  it('Test 6 (Zero-Quota Refusal): should refuse out-of-scope question below 0.50 threshold without calling Gemini chat model', async () => {
    await setupUsers();

    const mockGenerateContent = jest.fn();
    const mockValues = Array(768).fill(0.036);

    jest.spyOn(geminiConfig.genAI, 'getGenerativeModel').mockImplementation((config: any) => {
      if (config?.model?.includes('embedding')) {
        return {
          embedContent: jest.fn().mockResolvedValue({
            embedding: { values: mockValues },
          }),
        } as any;
      }
      return {
        generateContent: mockGenerateContent,
      } as any;
    });

    // Mock Pinecone to return a match with score 0.35 (below 0.50 cutoff)
    const mockQuery = jest.fn().mockResolvedValue({
      matches: [
        {
          score: 0.35,
          metadata: { text: 'Unrelated campus gossip notes', filename: 'notes.txt' },
        },
      ],
    });
    jest.spyOn(pineconeConfig, 'getPineconeIndex').mockReturnValue({
      query: mockQuery,
    } as any);

    const res = await request(app)
      .post('/api/chat/ask')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ message: 'How do I bake a chocolate cake at home?' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.aiMessage.content).toBe('Relevant information is unavailable in the current knowledge base.');
    expect(res.body.data.aiMessage.sources).toEqual([]);

    // ZERO-QUOTA GUARANTEE: LLM was never invoked!
    expect(mockGenerateContent).not.toHaveBeenCalled();

    // Verify both messages were persisted
    expect(await ChatMessage.countDocuments()).toBe(2);
    expect(await ChatSession.countDocuments()).toBe(1);
  });

  it('Test 7 (In-Scope & Deduplication): should call Gemini and deduplicate sources when chunks come from the same file', async () => {
    await setupUsers();

    const mockGenerateContent = jest.fn().mockResolvedValue({
      response: { text: () => 'Admissions deadline is July 31st with a 60% aggregate cutoff.' },
    });
    const mockValues = Array(768).fill(0.036);

    jest.spyOn(geminiConfig.genAI, 'getGenerativeModel').mockImplementation((config: any) => {
      if (config?.model?.includes('embedding')) {
        return {
          embedContent: jest.fn().mockResolvedValue({
            embedding: { values: mockValues },
          }),
        } as any;
      }
      return {
        generateContent: mockGenerateContent,
      } as any;
    });

    // Mock Pinecone with 2 high-scoring chunks both from 'admissions_guide.pdf'
    const mockQuery = jest.fn().mockResolvedValue({
      matches: [
        {
          score: 0.88,
          metadata: { text: 'Admissions close July 31st.', filename: 'admissions_guide.pdf' },
        },
        {
          score: 0.82,
          metadata: { text: 'Minimum cutoff is 60% aggregate.', filename: 'admissions_guide.pdf' },
        },
      ],
    });
    jest.spyOn(pineconeConfig, 'getPineconeIndex').mockReturnValue({
      query: mockQuery,
    } as any);

    const res = await request(app)
      .post('/api/chat/ask')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ message: 'When do admissions close and what is the cutoff?' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.aiMessage.content).toBe('Admissions deadline is July 31st with a 60% aggregate cutoff.');

    // Deduplication check: single filename in array
    expect(res.body.data.aiMessage.sources).toEqual(['admissions_guide.pdf']);

    // LLM was called
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);

    // Check message ordering
    const messages = await ChatMessage.find().sort({ createdAt: 1 });
    expect(messages.length).toBe(2);
    expect(messages[0].role).toBe('user');
    expect(messages[1].role).toBe('ai');
    expect(messages[0].createdAt.getTime()).toBeLessThan(messages[1].createdAt.getTime());
  });

  it('Test 8 (Vector Search Outage): should return 502 Bad Gateway and leave 0 messages and 0 sessions in MongoDB when Pinecone query fails', async () => {
    await setupUsers();
    mockQueryEmbedding();

    // Mock Pinecone query failure
    jest.spyOn(pineconeConfig, 'getPineconeIndex').mockReturnValue({
      query: jest.fn().mockRejectedValue(new Error('Pinecone cluster unavailable: 503')),
    } as any);

    const res = await request(app)
      .post('/api/chat/ask')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ message: 'What is the fee structure?' });

    expect(res.status).toBe(502);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Vector search service is currently unavailable');

    // Generate first, then persist guarantee: ZERO records in database
    expect(await ChatMessage.countDocuments()).toBe(0);
    expect(await ChatSession.countDocuments()).toBe(0);
  });

  it('Test 9 (AI Outage): should return 502 Bad Gateway and leave 0 messages and 0 sessions in MongoDB when Gemini generation fails', async () => {
    await setupUsers();

    const mockValues = Array(768).fill(0.036);
    jest.spyOn(geminiConfig.genAI, 'getGenerativeModel').mockImplementation((config: any) => {
      if (config?.model?.includes('embedding')) {
        return {
          embedContent: jest.fn().mockResolvedValue({
            embedding: { values: mockValues },
          }),
        } as any;
      }
      return {
        generateContent: jest.fn().mockRejectedValue(new Error('Google AI Quota exceeded: 429')),
      } as any;
    });

    jest.spyOn(pineconeConfig, 'getPineconeIndex').mockReturnValue({
      query: jest.fn().mockResolvedValue({
        matches: [
          {
            score: 0.85,
            metadata: { text: 'Tuition fee is $5000 per term.', filename: 'fees.pdf' },
          },
        ],
      }),
    } as any);

    const res = await request(app)
      .post('/api/chat/ask')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ message: 'What is the tuition fee?' });

    expect(res.status).toBe(502);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('AI generation service is currently unavailable');

    // Zero messages and zero sessions left in database
    expect(await ChatMessage.countDocuments()).toBe(0);
    expect(await ChatSession.countDocuments()).toBe(0);
  });

  it('Test 10 (Model Fallback): should fall back from primary model to secondary model on transient error and succeed', async () => {
    await setupUsers();

    const mockValues = Array(768).fill(0.036);
    let attempts = 0;

    jest.spyOn(geminiConfig.genAI, 'getGenerativeModel').mockImplementation((config: any) => {
      if (config?.model?.includes('embedding')) {
        return {
          embedContent: jest.fn().mockResolvedValue({
            embedding: { values: mockValues },
          }),
        } as any;
      }
      // Primary model fails, secondary fallback model succeeds
      return {
        generateContent: jest.fn().mockImplementation(() => {
          attempts++;
          if (attempts === 1) {
            return Promise.reject(new Error('Primary model 503 unavailable'));
          }
          return Promise.resolve({
            response: { text: () => 'Fallback model generated verified response.' },
          });
        }),
      } as any;
    });

    jest.spyOn(pineconeConfig, 'getPineconeIndex').mockReturnValue({
      query: jest.fn().mockResolvedValue({
        matches: [
          {
            score: 0.79,
            metadata: { text: 'Library closes at 9 PM.', filename: 'library.pdf' },
          },
        ],
      }),
    } as any);

    const res = await request(app)
      .post('/api/chat/ask')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ message: 'When does the library close?' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.aiMessage.content).toBe('Fallback model generated verified response.');
    expect(attempts).toBe(2);

    // Successfully persisted
    expect(await ChatMessage.countDocuments()).toBe(2);
    expect(await ChatSession.countDocuments()).toBe(1);
  });
});
