const request = require('supertest');
const express = require('express');
const cors = require('cors');
const apiRouter = require('../routes/api');
const errorHandler = require('../middleware/errorHandler');
const User = require('../models/User');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', apiRouter);
app.use(errorHandler);

describe('Traffic API', () => {
  let authToken;

  beforeAll(async () => {
    // Create a test user and get token
    const testUser = {
      email: `traffictest${Date.now()}@example.com`,
      password: 'testpassword123'
    };
    const user = await User.create(testUser);
    authToken = User.generateToken(user);
  });

  describe('GET /api/traffic', () => {
    it('should get traffic data', async () => {
      const res = await request(app)
        .get('/api/traffic')
        .expect(200);

      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('areas');
      expect(Array.isArray(res.body.areas)).toBe(true);
    });
  });

  describe('GET /api/traffic/:id', () => {
    it('should get a specific traffic area', async () => {
      const res = await request(app)
        .get('/api/traffic/A1')
        .expect(200);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('name');
      expect(res.body).toHaveProperty('congestion');
    });

    it('should return 404 for non-existent area', async () => {
      const res = await request(app)
        .get('/api/traffic/INVALID')
        .expect(404);

      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/traffic', () => {
    it('should create a new traffic area with authentication', async () => {
      const newArea = {
        id: `TEST${Date.now()}`,
        name: 'Test Area',
        congestion: 50
      };

      const res = await request(app)
        .post('/api/traffic')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newArea)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe(newArea.name);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app)
        .post('/api/traffic')
        .send({ id: 'TEST', name: 'Test', congestion: 50 })
        .expect(401);
    });
  });

  describe('PUT /api/traffic/:id', () => {
    it('should update a traffic area', async () => {
      const res = await request(app)
        .put('/api/traffic/A1')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ congestion: 75 })
        .expect(200);

      expect(res.body).toHaveProperty('congestion');
    });
  });

  describe('PUT /api/traffic (bulk update)', () => {
    it('should update multiple traffic areas', async () => {
      const updates = [
        { id: 'A1', congestion: 60 },
        { id: 'A2', congestion: 70 }
      ];

      const res = await request(app)
        .put('/api/traffic')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ areas: updates })
        .expect(200);

      expect(res.body).toHaveProperty('areas');
    });
  });
});

