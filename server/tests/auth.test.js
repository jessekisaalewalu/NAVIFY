const request = require('supertest');
const express = require('express');
const cors = require('cors');
const apiRouter = require('../routes/api');
const errorHandler = require('../middleware/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', apiRouter);
app.use(errorHandler);

describe('Auth API', () => {
  let authToken;
  let testUser = {
    email: `test${Date.now()}@example.com`,
    password: 'testpassword123',
    name: 'Test User'
  };

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(testUser.email);
      authToken = res.body.token;
    });

    it('should reject duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(409);

      expect(res.body).toHaveProperty('error');
    });

    it('should validate email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'invalid-email', password: 'test123' })
        .expect(400);

      expect(res.body).toHaveProperty('errors');
    });

    it('should validate password length', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test2@example.com', password: '123' })
        .expect(400);

      expect(res.body).toHaveProperty('errors');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      authToken = res.body.token;
    });

    it('should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(res.body).toHaveProperty('error');
    });

    it('should reject non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        })
        .expect(401);

      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should get user profile with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(testUser.email);
    });

    it('should reject request without token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(res.body).toHaveProperty('error');
    });

    it('should reject request with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(res.body).toHaveProperty('error');
    });
  });
});

