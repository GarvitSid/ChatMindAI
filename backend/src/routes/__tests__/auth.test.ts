import request from 'supertest';
import app from '../../app.js';
import { connectTestDB, clearTestDB, closeTestDB } from '../../test/dbHelper.js';

jest.setTimeout(30000);

beforeAll(async () => {
  await connectTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

describe('Slice 1: Authentication & Authorization Integration Tests', () => {
  // Test 1: Register creates student and silently ignores client-sent role: 'admin'
  it('Test 1: should register a student account and ignore client-supplied role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Alex Rivers',
        email: 'alex.rivers@chatmind.edu',
        password: 'Password123',
        role: 'admin', // Should be silently ignored
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('student');
    expect(res.body.data.user.email).toBe('alex.rivers@chatmind.edu');
    expect(res.body.data.user.password).toBeUndefined();
  });

  // Test 2: Reject invalid email format with 400 Bad Request
  it('Test 2: should reject registration with invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Invalid Email User',
        email: 'not-a-valid-email',
        password: 'Password123',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/valid email/i);
  });

  // Test 3: Reject weak or short password with 400 Bad Request
  it('Test 3: should reject registration with password under 8 chars or letters-only', async () => {
    const shortRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Short Password',
        email: 'short@chatmind.edu',
        password: 'Pass1', // < 8 characters
      });

    expect(shortRes.status).toBe(400);
    expect(shortRes.body.success).toBe(false);

    const noNumRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Letters Only',
        email: 'letters@chatmind.edu',
        password: 'PasswordOnly', // Missing numeric digit
      });

    expect(noNumRes.status).toBe(400);
    expect(noNumRes.body.success).toBe(false);
  });

  // Test 4: Return 409 Conflict when registering existing email (case-insensitive)
  it('Test 4: should return 409 Conflict for duplicate email regardless of case', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'First User',
        email: 'student@chatmind.edu',
        password: 'Password123',
      });

    const duplicateRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Second User',
        email: 'STUDENT@chatmind.edu', // Uppercase variation
        password: 'Password123',
      });

    expect(duplicateRes.status).toBe(409);
    expect(duplicateRes.body.success).toBe(false);
    expect(duplicateRes.body.message).toMatch(/already exists/i);
  });

  // Test 5: Login succeeds with valid credentials; response excludes password
  it('Test 5: should login successfully and omit password field from response', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Login User',
        email: 'login.user@chatmind.edu',
        password: 'Password123',
      });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login.user@chatmind.edu',
        password: 'Password123',
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.data.token).toBeDefined();
    expect(loginRes.body.data.user.email).toBe('login.user@chatmind.edu');
    expect(loginRes.body.data.user.password).toBeUndefined();
    expect((loginRes.body as any).password).toBeUndefined();
  });

  // Test 6: Return generic 401 for both unknown email and wrong password (prevents user enumeration)
  it('Test 6: should return identical 401 for invalid email and incorrect password', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Existing User',
        email: 'existing@chatmind.edu',
        password: 'Password123',
      });

    // Unknown email
    const unknownRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@chatmind.edu',
        password: 'Password123',
      });

    expect(unknownRes.status).toBe(401);
    expect(unknownRes.body.success).toBe(false);
    expect(unknownRes.body.message).toBe('Invalid email or password');

    // Wrong password for existing user
    const wrongPassRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'existing@chatmind.edu',
        password: 'WrongPassword999',
      });

    expect(wrongPassRes.status).toBe(401);
    expect(wrongPassRes.body.success).toBe(false);
    expect(wrongPassRes.body.message).toBe('Invalid email or password');
  });

  // Test 7: GET /api/auth/me returns 401 without token, 200 with profile when valid
  it('Test 7: should return 401 on /me without token and 200 with profile when valid', async () => {
    const unauthRes = await request(app).get('/api/auth/me');
    expect(unauthRes.status).toBe(401);
    expect(unauthRes.body.success).toBe(false);

    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Profile User',
        email: 'profile.user@chatmind.edu',
        password: 'Password123',
      });

    const token = regRes.body.data.token;

    const authRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(authRes.status).toBe(200);
    expect(authRes.body.success).toBe(true);
    expect(authRes.body.data.user.email).toBe('profile.user@chatmind.edu');
    expect(authRes.body.data.user.role).toBe('student');
    expect(authRes.body.data.user.password).toBeUndefined();
  });

  // Test 8: GET /api/documents returns 403 for student token and 401 without token
  it('Test 8: should return 403 on GET /api/documents for student and 401 for unauthenticated request', async () => {
    // 8a: Without token
    const noTokenRes = await request(app).get('/api/documents');
    expect(noTokenRes.status).toBe(401);
    expect(noTokenRes.body.success).toBe(false);

    // 8b: With student token
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Student Auditor',
        email: 'auditor@chatmind.edu',
        password: 'Password123',
      });

    const studentToken = regRes.body.data.token;

    const studentRes = await request(app)
      .get('/api/documents')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(studentRes.status).toBe(403);
    expect(studentRes.body.success).toBe(false);
    expect(studentRes.body.message).toMatch(/admin/i);
  });
});
