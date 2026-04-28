import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import app from '../../app.js';
import { connectTestDB, clearTestDB, closeTestDB } from '../../test/dbHelper.js';
import { User } from '../../models/User.js';
import { DocumentModel } from '../../models/Document.js';
import { RagService } from '../../services/rag.service.js';
import * as pineconeConfig from '../../config/pinecone.js';

jest.setTimeout(30000);

let adminToken: string;
let studentToken: string;
let adminUserId: mongoose.Types.ObjectId;

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
    email: 'admin.deletion@chatmind.edu',
    password: 'HashedPassword123',
    role: 'admin',
  });
  adminUserId = admin._id;
  adminToken = jwt.sign(
    { userId: admin._id.toString(), email: admin.email, role: 'admin' },
    secret,
    { expiresIn: '1d' }
  );

  const student = await User.create({
    name: 'Student Auditor',
    email: 'student.deletion@chatmind.edu',
    password: 'HashedPassword123',
    role: 'student',
  });
  studentToken = jwt.sign(
    { userId: student._id.toString(), email: student.email, role: 'student' },
    secret,
    { expiresIn: '1d' }
  );
};

describe('Slice 3: Deletion and Consistency (7 API Tests + 1 Service Unit Test)', () => {
  // --- 7 API Integration Tests ---

  it('Test 1 (API): should reject unauthenticated delete request with 401 Unauthorized', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).delete(`/api/documents/${fakeId}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('Test 2 (API): should reject non-admin (student) delete request with 403 Forbidden', async () => {
    await setupUsers();
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .delete(`/api/documents/${fakeId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('Test 3 (API): should return 404 Not Found on malformed ObjectId without throwing CastError 500', async () => {
    await setupUsers();

    const res = await request(app)
      .delete('/api/documents/invalid-hex-123')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Document not found');
  });

  it('Test 4 (API): should return 404 Not Found when document does not exist', async () => {
    await setupUsers();
    const nonExistentId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .delete(`/api/documents/${nonExistentId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Document not found');
  });

  it('Test 5 (API): should perform cascading delete: purges Pinecone vectors first, then deletes Mongo document', async () => {
    await setupUsers();

    const mockDeleteMany = jest.fn().mockResolvedValue({});
    jest.spyOn(pineconeConfig, 'getPineconeIndex').mockReturnValue({
      deleteMany: mockDeleteMany,
    } as any);

    const doc = await DocumentModel.create({
      filename: 'academic_calendar.pdf',
      fileSize: 2048,
      chunkCount: 3,
      uploadedBy: adminUserId,
    });

    const res = await request(app)
      .delete(`/api/documents/${doc._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('deleted successfully');

    // Verify Pinecone deleteMany was called with exact chunk IDs
    expect(mockDeleteMany).toHaveBeenCalledTimes(1);
    expect(mockDeleteMany).toHaveBeenCalledWith([
      `${doc._id}_chunk_0`,
      `${doc._id}_chunk_1`,
      `${doc._id}_chunk_2`,
    ]);

    // Verify document was removed from MongoDB
    const found = await DocumentModel.findById(doc._id);
    expect(found).toBeNull();
  });

  it('Test 6 (API): should handle document with chunkCount: 0 by deleting Mongo record without calling Pinecone', async () => {
    await setupUsers();

    const mockDeleteMany = jest.fn().mockResolvedValue({});
    jest.spyOn(pineconeConfig, 'getPineconeIndex').mockReturnValue({
      deleteMany: mockDeleteMany,
    } as any);

    const doc = await DocumentModel.create({
      filename: 'empty_memo.txt',
      fileSize: 50,
      chunkCount: 0,
      uploadedBy: adminUserId,
    });

    const res = await request(app)
      .delete(`/api/documents/${doc._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Pinecone deleteMany should NOT have been called
    expect(mockDeleteMany).not.toHaveBeenCalled();

    // Verify document was removed from MongoDB
    const found = await DocumentModel.findById(doc._id);
    expect(found).toBeNull();
  });

  it('Test 7 (API): should preserve document in MongoDB on vector delete failure (502), and allow successful idempotent retry', async () => {
    await setupUsers();

    let attempts = 0;
    const mockDeleteMany = jest.fn().mockImplementation(() => {
      attempts++;
      if (attempts <= 3) {
        // Fail on initial request across all 3 retries
        return Promise.reject(new Error('Pinecone unavailable: service outage'));
      }
      // Succeed on subsequent retry request
      return Promise.resolve({});
    });

    jest.spyOn(pineconeConfig, 'getPineconeIndex').mockReturnValue({
      deleteMany: mockDeleteMany,
    } as any);

    const doc = await DocumentModel.create({
      filename: 'campus_policy.pdf',
      fileSize: 4096,
      chunkCount: 2,
      uploadedBy: adminUserId,
    });

    // 1. Initial Delete Attempt (fails at vector store)
    const res1 = await request(app)
      .delete(`/api/documents/${doc._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res1.status).toBe(502);
    expect(res1.body.success).toBe(false);
    expect(res1.body.message).toBe('Failed to remove document vectors. The document was kept so you can retry.');

    // Crucial guarantee: Document is PRESERVED in MongoDB
    const docStillExists = await DocumentModel.findById(doc._id);
    expect(docStillExists).not.toBeNull();
    expect(docStillExists?.filename).toBe('campus_policy.pdf');

    // 2. Retry Delete Attempt (now succeeds)
    const res2 = await request(app)
      .delete(`/api/documents/${doc._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res2.status).toBe(200);
    expect(res2.body.success).toBe(true);

    // Document is now removed from MongoDB
    const docDeleted = await DocumentModel.findById(doc._id);
    expect(docDeleted).toBeNull();
  });

  // --- 1 Service Unit Test ---

  it('Test 8 (Service Unit): RagService.deleteDocumentVectors should construct exact chunk IDs and batch by 100', async () => {
    const mockDeleteMany = jest.fn().mockResolvedValue({});
    jest.spyOn(pineconeConfig, 'getPineconeIndex').mockReturnValue({
      deleteMany: mockDeleteMany,
    } as any);

    const testDocId = new mongoose.Types.ObjectId().toString();
    await RagService.deleteDocumentVectors(testDocId, 250, 'handbook.pdf');

    // Exactly 3 batches: 100, 100, 50
    expect(mockDeleteMany).toHaveBeenCalledTimes(3);

    const batch1 = mockDeleteMany.mock.calls[0][0];
    expect(batch1.length).toBe(100);
    expect(batch1[0]).toBe(`${testDocId}_chunk_0`);
    expect(batch1[99]).toBe(`${testDocId}_chunk_99`);

    const batch2 = mockDeleteMany.mock.calls[1][0];
    expect(batch2.length).toBe(100);
    expect(batch2[0]).toBe(`${testDocId}_chunk_100`);
    expect(batch2[99]).toBe(`${testDocId}_chunk_199`);

    const batch3 = mockDeleteMany.mock.calls[2][0];
    expect(batch3.length).toBe(50);
    expect(batch3[0]).toBe(`${testDocId}_chunk_200`);
    expect(batch3[49]).toBe(`${testDocId}_chunk_249`);
  });
});
