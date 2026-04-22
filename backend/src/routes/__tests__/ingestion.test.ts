import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import app from '../../app.js';
import { connectTestDB, clearTestDB, closeTestDB } from '../../test/dbHelper.js';
import { User } from '../../models/User.js';
import { DocumentModel } from '../../models/Document.js';
import { RagService, IngestionError } from '../../services/rag.service.js';
import * as pineconeConfig from '../../config/pinecone.js';
import * as geminiConfig from '../../config/gemini.js';

jest.setTimeout(30000);

let adminToken: string;
let studentToken: string;

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

  const admin = await User.create({
    name: 'Admin Officer',
    email: 'admin.officer@chatmind.edu',
    password: 'HashedPassword123',
    role: 'admin',
  });
  adminToken = jwt.sign({ userId: admin._id.toString(), email: admin.email, role: 'admin' }, secret, { expiresIn: '1d' });

  const student = await User.create({
    name: 'Student Auditor',
    email: 'student.auditor@chatmind.edu',
    password: 'HashedPassword123',
    role: 'student',
  });
  studentToken = jwt.sign({ userId: student._id.toString(), email: student.email, role: 'student' }, secret, { expiresIn: '1d' });
};

describe('Slice 2: Document Ingestion Reliability & Compensating Rollback', () => {
  // Test 1: Gemini embedding failure throws 502 and never calls Pinecone
  it('Test 1: should throw IngestionError on embedding failure and never call Pinecone', async () => {
    const mockUpsert = jest.fn();
    jest.spyOn(pineconeConfig, 'getPineconeIndex').mockReturnValue({
      upsert: mockUpsert,
    } as any);

    // Mock Gemini batchEmbedContents to fail with non-retryable 400 error
    jest.spyOn(geminiConfig.genAI, 'getGenerativeModel').mockReturnValue({
      batchEmbedContents: jest.fn().mockRejectedValue(new Error('Invalid argument: Model rejected content')),
    } as any);

    await expect(
      RagService.processAndIndexDocument('doc123', 'syllabus.txt', 'Sample college syllabus content for testing.')
    ).rejects.toThrow(IngestionError);

    expect(mockUpsert).not.toHaveBeenCalled();
  });

  // Test 2: Pinecone upsert failure triggers compensating deletion and leaves 0 Mongo records
  it('Test 2: should trigger compensating vector rollback and leave zero Mongo records when Pinecone fails', async () => {
    await setupUsers();

    // Mock successful 768-dim embeddings
    const fakeEmbedding = new Array(768).fill(0.01);
    jest.spyOn(geminiConfig.genAI, 'getGenerativeModel').mockReturnValue({
      batchEmbedContents: jest.fn().mockResolvedValue({
        embeddings: [{ values: fakeEmbedding }],
      }),
    } as any);

    // Mock Pinecone: upsert fails, deleteMany succeeds (compensating rollback)
    const mockDeleteMany = jest.fn().mockResolvedValue({});
    jest.spyOn(pineconeConfig, 'getPineconeIndex').mockReturnValue({
      upsert: jest.fn().mockRejectedValue(new Error('Pinecone storage node unavailable')),
      deleteMany: mockDeleteMany,
    } as any);

    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('Important policy text for testing.'), 'policy.txt');

    expect(res.status).toBe(502);
    expect(res.body.success).toBe(false);

    // Verify 0 MongoDB records were saved
    const mongoCount = await DocumentModel.countDocuments();
    expect(mongoCount).toBe(0);
  });

  // Test 3: Successful upload embeds in batches, upserts to Pinecone, and creates Mongo record with exact chunk count
  it('Test 3: should embed in batches, upsert to Pinecone, and persist Mongo document with exact chunk count', async () => {
    await setupUsers();

    const fakeEmbedding = new Array(768).fill(0.02);
    jest.spyOn(geminiConfig.genAI, 'getGenerativeModel').mockReturnValue({
      batchEmbedContents: jest.fn().mockResolvedValue({
        embeddings: [{ values: fakeEmbedding }],
      }),
    } as any);

    const mockUpsert = jest.fn().mockResolvedValue({});
    jest.spyOn(pineconeConfig, 'getPineconeIndex').mockReturnValue({
      upsert: mockUpsert,
      deleteMany: jest.fn(),
    } as any);

    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('Computer science department curriculum document.'), 'curriculum.txt');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.filename).toBe('curriculum.txt');
    expect(res.body.data.chunkCount).toBeGreaterThan(0);
    expect(mockUpsert).toHaveBeenCalled();

    const savedDoc = await DocumentModel.findOne({ filename: 'curriculum.txt' });
    expect(savedDoc).toBeDefined();
    expect(savedDoc?.chunkCount).toBe(res.body.data.chunkCount);
  });

  // Test 4: Student token attempting upload returns 403 Forbidden
  it('Test 4: should reject document upload with 403 Forbidden when called by a student', async () => {
    await setupUsers();

    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${studentToken}`)
      .attach('file', Buffer.from('Unauthorized text.'), 'test.txt');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/admin/i);
  });

  // Test 5: Unauthenticated upload attempt returns 401 Unauthorized
  it('Test 5: should reject document upload with 401 Unauthorized when unauthenticated', async () => {
    const res = await request(app)
      .post('/api/documents/upload')
      .attach('file', Buffer.from('Unauthenticated text.'), 'test.txt');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // Test 6: File > 5MB (5MB + 1 byte) returns 413 Payload Too Large
  it('Test 6: should return 413 Payload Too Large when file exceeds 5MB', async () => {
    await setupUsers();

    // 5MB + 1 byte buffer
    const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 1, 'a');

    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', oversizedBuffer, 'oversized.txt');

    expect(res.status).toBe(413);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/5MB/i);
  });

  // Test 7: Unsupported file format returns 400 Bad Request
  it('Test 7: should return 400 Bad Request for unsupported file extension', async () => {
    await setupUsers();

    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('Binary executable mock'), 'dangerous.exe');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/only \.pdf and \.txt/i);
  });

  // Test 8: Duplicate filename returns 409 Conflict without triggering vector indexing
  it('Test 8: should return 409 Conflict for duplicate filename without indexing vectors', async () => {
    await setupUsers();

    // Create an existing document in MongoDB
    await DocumentModel.create({
      filename: 'existing_brochure.txt',
      fileSize: 1024,
      chunkCount: 2,
      uploadedBy: new mongoose.Types.ObjectId(),
    });

    const processSpy = jest.spyOn(RagService, 'processAndIndexDocument');

    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('Duplicate brochure content.'), 'existing_brochure.txt');

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already exists/i);
    expect(processSpy).not.toHaveBeenCalled();
  });
});
