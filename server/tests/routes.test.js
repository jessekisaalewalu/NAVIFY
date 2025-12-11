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

describe('Routes API', () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    // Create a test user and get token
    const testUser = {
      email: `routetest${Date.now()}@example.com`,
      password: 'testpassword123'
    };
    const user = await User.create(testUser);
    userId = user.id;
    authToken = User.generateToken(user);
  });

  describe('GET /api/routes', () => {
    it('should get routes with origin and destination', async () => {
      const res = await request(app)
        .get('/api/routes')
        .query({ origin: 'San Francisco', dest: 'Los Angeles' })
        .expect(200);

      expect(res.body).toHaveProperty('routes');
      expect(Array.isArray(res.body.routes)).toBe(true);
    }, 10000);  // 10 second timeout for OSRM API call

    it('should require origin and destination', async () => {
      const res = await request(app)
        .get('/api/routes')
        .expect(400);

      expect(res.body).toHaveProperty('errors');
    });
  });

  describe('POST /api/routes (save route)', () => {
    it('should save a route with authentication', async () => {
      const routeData = {
        originAddress: 'San Francisco, CA',
        originLat: 37.7749,
        originLng: -122.4194,
        destAddress: 'Los Angeles, CA',
        destLat: 34.0522,
        destLng: -118.2437,
        distanceKm: 615.5,
        durationMin: 360
      };

      const res = await request(app)
        .post('/api/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(routeData)
        .expect(201);

      expect(res.body).toHaveProperty('id');
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app)
        .post('/api/routes')
        .send({ originAddress: 'Test' })
        .expect(401);
    });
  });

  describe('GET /api/routes/saved', () => {
    it('should get saved routes for authenticated user', async () => {
      const res = await request(app)
        .get('/api/routes/saved')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('routes');
      expect(Array.isArray(res.body.routes)).toBe(true);
    });
  });
});

