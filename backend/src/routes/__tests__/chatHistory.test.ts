import request from 'supertest';
import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import app from '../../app.js';
import { connectTestDB, clearTestDB, closeTestDB } from '../../test/dbHelper.js';
import { User } from '../../models/User.js';
import { ChatSession } from '../../models/ChatSession.js';
import { ChatMessage } from '../../models/ChatMessage.js';
import { createUserChatLimiter } from '../../middlewares/rateLimiter.js';
import * as pineconeConfig from '../../config/pinecone.js';
import * as geminiConfig from '../../config/gemini.js';

jest.setTimeout(30000);

let studentAToken: string;
let studentAId: mongoose.Types.ObjectId;
let studentBToken: string;
let studentBId: mongoose.Types.ObjectId;

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

  const userA = await User.create({
    name: 'Alice Student',
    email: 'alice@chatmind.edu',
    password: 'HashedPassword123',
    role: 'student',
  });
  studentAId = userA._id;
  studentAToken = jwt.sign(
    { userId: userA._id.toString(), email: userA.email, role: 'student' },
    secret,
    { expiresIn: '1d' }
  );

  const userB = await User.create({
    name: 'Bob Student',
    email: 'bob@chatmind.edu',
    password: 'HashedPassword123',
    role: 'student',
  });
  studentBId = userB._id;
  studentBToken = jwt.sign(
    { userId: userB._id.toString(), email: userB.email, role: 'student' },
    secret,
    { expiresIn: '1d' }
  );
};

// Helper for standard RAG mocks
const mockSuccessfulRAG = (answerText: string = 'Verified campus information.') => {
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
        response: { text: () => answerText },
      }),
    } as any;
  });

  jest.spyOn(pineconeConfig, 'getPineconeIndex').mockReturnValue({
    query: jest.fn().mockResolvedValue({
      matches: [
        {
          score: 0.91,
          metadata: { text: 'Information text snippet', filename: 'handbook.pdf' },
        },
      ],
    }),
  } as any);
};

describe('Slice 5: Chat History, Multi-Tenancy & User Safety', () => {
  it('Test 1: should reject unauthenticated session listing with 401 Unauthorized', async () => {
    const res = await request(app).get('/api/chat/sessions');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('Test 2: should ensure tenant isolation on sessions list (User A only sees their own sessions)', async () => {
    await setupUsers();

    // Seed session for User A
    const sessionA = await ChatSession.create({
      userId: studentAId,
      title: 'Alice Conversation',
    });

    // Seed session for User B
    const sessionB = await ChatSession.create({
      userId: studentBId,
      title: 'Bob Conversation',
    });

    // Request as Alice
    const resA = await request(app)
      .get('/api/chat/sessions')
      .set('Authorization', `Bearer ${studentAToken}`);

    expect(resA.status).toBe(200);
    expect(resA.body.success).toBe(true);
    expect(resA.body.data).toHaveLength(1);
    expect(resA.body.data[0]._id).toBe(sessionA._id.toString());
    expect(resA.body.data[0].title).toBe('Alice Conversation');

    // Request as Bob
    const resB = await request(app)
      .get('/api/chat/sessions')
      .set('Authorization', `Bearer ${studentBToken}`);

    expect(resB.status).toBe(200);
    expect(resB.body.success).toBe(true);
    expect(resB.body.data).toHaveLength(1);
    expect(resB.body.data[0]._id).toBe(sessionB._id.toString());
    expect(resB.body.data[0].title).toBe('Bob Conversation');
  });

  it('Test 3: should ensure tenant isolation on session lookup (User A cannot access User B session)', async () => {
    await setupUsers();

    // Create session belonging to Bob
    const sessionB = await ChatSession.create({
      userId: studentBId,
      title: 'Bob Private Session',
    });

    // Alice attempts to read Bob's session
    const res = await request(app)
      .get(`/api/chat/sessions/${sessionB._id}`)
      .set('Authorization', `Bearer ${studentAToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Chat session not found');
  });

  it('Test 4: should prevent session existence leakage by returning identical 404 responses for foreign vs non-existent sessions', async () => {
    await setupUsers();

    // Valid 24-hex ID belonging to Bob
    const sessionB = await ChatSession.create({
      userId: studentBId,
      title: 'Bob Secret Conversation',
    });

    // Valid 24-hex ID that does not exist anywhere
    const nonExistentId = new mongoose.Types.ObjectId().toString();

    // Alice queries Bob's session
    const foreignRes = await request(app)
      .get(`/api/chat/sessions/${sessionB._id}`)
      .set('Authorization', `Bearer ${studentAToken}`);

    // Alice queries non-existent session
    const nonExistentRes = await request(app)
      .get(`/api/chat/sessions/${nonExistentId}`)
      .set('Authorization', `Bearer ${studentAToken}`);

    expect(foreignRes.status).toBe(404);
    expect(nonExistentRes.status).toBe(404);
    // Bodies must be completely identical so attacker cannot detect whether ID exists
    expect(foreignRes.body).toEqual(nonExistentRes.body);
    expect(foreignRes.body).toEqual({
      success: false,
      message: 'Chat session not found',
    });
  });

  it('Test 5: should reject malformed 24-hex session ID with clean 404 Not Found without Mongoose CastError', async () => {
    await setupUsers();

    const res = await request(app)
      .get('/api/chat/sessions/invalid-hex-format')
      .set('Authorization', `Bearer ${studentAToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Chat session not found');
  });

  it('Test 6: should support lazy session continuity (ask with sessionId null creates session, subsequent ask reuses it)', async () => {
    await setupUsers();
    mockSuccessfulRAG('First response from AI.');

    // 1. Initial ask with sessionId null (lazy session creation)
    const res1 = await request(app)
      .post('/api/chat/ask')
      .set('Authorization', `Bearer ${studentAToken}`)
      .send({
        sessionId: null,
        message: 'What is the syllabus for 2nd semester?',
      });

    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);
    const createdSessionId = res1.body.data.sessionId;
    expect(createdSessionId).toBeDefined();

    // Verify exactly 1 session was created in DB for Alice
    const sessionCountAfterFirst = await ChatSession.countDocuments({ userId: studentAId });
    expect(sessionCountAfterFirst).toBe(1);

    // Verify 2 messages exist (1 user, 1 AI)
    const messagesCountAfterFirst = await ChatMessage.countDocuments({ sessionId: createdSessionId });
    expect(messagesCountAfterFirst).toBe(2);

    // 2. Subsequent ask with the newly created sessionId
    mockSuccessfulRAG('Second response continuing the thread.');

    const res2 = await request(app)
      .post('/api/chat/ask')
      .set('Authorization', `Bearer ${studentAToken}`)
      .send({
        sessionId: createdSessionId,
        message: 'Are there any lab components?',
      });

    expect(res2.status).toBe(200);
    expect(res2.body.data.sessionId).toBe(createdSessionId);

    // Verify NO new session was created in DB (still exactly 1)
    const sessionCountAfterSecond = await ChatSession.countDocuments({ userId: studentAId });
    expect(sessionCountAfterSecond).toBe(1);

    // Verify total messages are now 4 in that same session
    const messagesCountAfterSecond = await ChatMessage.countDocuments({ sessionId: createdSessionId });
    expect(messagesCountAfterSecond).toBe(4);
  });

  it('Test 7: should return messages in deterministic chronological order sorted by createdAt then _id', async () => {
    await setupUsers();

    const session = await ChatSession.create({
      userId: studentAId,
      title: 'Ordered Conversation',
    });

    const now = Date.now();
    // Insert 4 messages with varying timestamps
    await ChatMessage.insertMany([
      {
        sessionId: session._id,
        role: 'user',
        content: 'First question',
        sources: [],
        createdAt: new Date(now),
      },
      {
        sessionId: session._id,
        role: 'ai',
        content: 'First reply',
        sources: [],
        createdAt: new Date(now + 10),
      },
      {
        sessionId: session._id,
        role: 'user',
        content: 'Second question',
        sources: [],
        createdAt: new Date(now + 20),
      },
      {
        sessionId: session._id,
        role: 'ai',
        content: 'Second reply',
        sources: [],
        createdAt: new Date(now + 30),
      },
    ]);

    const res = await request(app)
      .get(`/api/chat/sessions/${session._id}`)
      .set('Authorization', `Bearer ${studentAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const messages = res.body.data.messages;
    expect(messages).toHaveLength(4);
    expect(messages[0].content).toBe('First question');
    expect(messages[1].content).toBe('First reply');
    expect(messages[2].content).toBe('Second question');
    expect(messages[3].content).toBe('Second reply');
  });

  it('Test 8: should enforce per-user rate limiting using isolated test app without throttled leak to another user', async () => {
    await setupUsers();

    // Create an isolated Express app testing createUserChatLimiter with max: 2
    const testApp = express();
    testApp.use(express.json());

    // Middleware simulating authentication context
    testApp.use((req: any, _res: Response, next) => {
      const authHeader = req.headers.authorization;
      if (authHeader?.includes(studentAToken)) {
        req.user = { _id: studentAId };
      } else if (authHeader?.includes(studentBToken)) {
        req.user = { _id: studentBId };
      }
      next();
    });

    // Mount user rate limiter with max: 2 and skip: () => false
    const isolatedLimiter = createUserChatLimiter({
      max: 2,
      windowMs: 60 * 1000,
      skip: () => false,
    });

    testApp.post('/test-chat-ask', isolatedLimiter, (_req: Request, res: Response) => {
      res.status(200).json({ success: true, message: 'Question answered' });
    });

    // Alice Request 1 -> 200 OK
    const resA1 = await request(testApp)
      .post('/test-chat-ask')
      .set('Authorization', `Bearer ${studentAToken}`);
    expect(resA1.status).toBe(200);
    expect(resA1.headers['ratelimit-remaining']).toBe('1');

    // Alice Request 2 -> 200 OK
    const resA2 = await request(testApp)
      .post('/test-chat-ask')
      .set('Authorization', `Bearer ${studentAToken}`);
    expect(resA2.status).toBe(200);
    expect(resA2.headers['ratelimit-remaining']).toBe('0');

    // Alice Request 3 -> 429 Too Many Requests
    const resA3 = await request(testApp)
      .post('/test-chat-ask')
      .set('Authorization', `Bearer ${studentAToken}`);
    expect(resA3.status).toBe(429);
    expect(resA3.body.success).toBe(false);
    expect(resA3.body.message).toContain('Too many questions asked');

    // Bob Request 1 -> 200 OK (verifies User B is NOT throttled by User A's limit!)
    const resB1 = await request(testApp)
      .post('/test-chat-ask')
      .set('Authorization', `Bearer ${studentBToken}`);
    expect(resB1.status).toBe(200);
    expect(resB1.body.success).toBe(true);
  });
});
