const request = require('supertest');
const app = require('../server');

describe('CRUD Operations', () => {
  let authToken;
  let userId;
  let routeId;
  let trafficAreaId = 'area-test-001';
  let transitStopId;
  const uniqueSuffix = Date.now();
  const TEST_EMAIL = `testuser.${uniqueSuffix}@example.com`;
  const OTHER_EMAIL = `otheruser.${uniqueSuffix}@example.com`;

  // ===== AUTH CRUD =====
  describe('Authentication CRUD', () => {
    test('POST /api/auth/register - Create new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
          .send({
            email: TEST_EMAIL,
            password: 'testpass123',
            name: 'Test User'
          });

      expect(res.statusCode).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe(TEST_EMAIL);
      expect(res.body.user.name).toBe('Test User');

      authToken = res.body.token;
      userId = res.body.user.id;
    });

    test('POST /api/auth/register - Reject duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
          .send({
            email: TEST_EMAIL,
            password: 'testpass123',
            name: 'Another User'
          });

      expect(res.statusCode).toBe(409);
      expect(res.body.error).toBe('Email already exists');
    });

    test('POST /api/auth/login - Login user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
          .send({
            email: TEST_EMAIL,
            password: 'testpass123'
          });

      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe(TEST_EMAIL);
    });

    test('POST /api/auth/login - Reject invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'wrongpassword'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
    });

    test('GET /api/auth/profile - Read user profile', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user.email).toBe(TEST_EMAIL);
      expect(res.body.user.name).toBe('Test User');
    });

    test('PUT /api/auth/profile - Update user profile', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Updated User Name',
            email: `newemail.${uniqueSuffix}@example.com`
          });

      expect(res.statusCode).toBe(200);
      expect(res.body.user.name).toBe('Updated User Name');
      expect(res.body.user.email).toBe(`newemail.${uniqueSuffix}@example.com`);
    });

    test('GET /api/auth/profile - Reject without token', async () => {
      const res = await request(app).get('/api/auth/profile');

      expect(res.statusCode).toBe(401);
    });
  });

  // ===== ROUTES CRUD =====
  describe('Routes CRUD', () => {
    test('POST /api/routes - Save a new route', async () => {
      const res = await request(app)
        .post('/api/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          originAddress: '123 Main St',
          originLat: 37.7749,
          originLng: -122.4194,
          destAddress: '456 Oak Ave',
          destLat: 37.7849,
          destLng: -122.4094,
          distanceKm: 8.5,
          durationMin: 15
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.originAddress).toBe('123 Main St');
      expect(res.body.destAddress).toBe('456 Oak Ave');

      routeId = res.body.id;
    });

    test('GET /api/routes/saved - Read all saved routes', async () => {
      const res = await request(app)
        .get('/api/routes/saved')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.routes)).toBe(true);
      expect(res.body.routes.length).toBeGreaterThan(0);
    });

    test('GET /api/routes/saved/:id - Read specific saved route', async () => {
      const res = await request(app)
        .get(`/api/routes/saved/${routeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(routeId);
      expect(res.body.originAddress).toBe('123 Main St');
    });

    test('PUT /api/routes/saved/:id - Update saved route', async () => {
      const res = await request(app)
        .put(`/api/routes/saved/${routeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          distanceKm: 9.0,
          durationMin: 18
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.distanceKm).toBe(9.0);
      expect(res.body.durationMin).toBe(18);
    });

    test('DELETE /api/routes/saved/:id - Delete saved route', async () => {
      const res = await request(app)
        .delete(`/api/routes/saved/${routeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('deleted');
    });

    test('GET /api/routes/saved/:id - Confirm route is deleted', async () => {
      const res = await request(app)
        .get(`/api/routes/saved/${routeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
    });
  });

  // ===== TRAFFIC CRUD =====
  describe('Traffic CRUD', () => {
    test('POST /api/traffic - Create traffic area', async () => {
      const res = await request(app)
        .post('/api/traffic')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          id: trafficAreaId,
          name: 'Test Traffic Area',
          congestion: 45,
          lat: 37.7749,
          lng: -122.4194
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.name).toBe('Test Traffic Area');
      expect(res.body.congestion).toBe(45);
    });

    test('GET /api/traffic - Read all traffic areas', async () => {
      const res = await request(app).get('/api/traffic');

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.areas)).toBe(true);
    });

    test('GET /api/traffic/:id - Read specific traffic area', async () => {
      const res = await request(app).get(`/api/traffic/${trafficAreaId}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe('Test Traffic Area');
    });

    test('PUT /api/traffic/:id - Update traffic area', async () => {
      const res = await request(app)
        .put(`/api/traffic/${trafficAreaId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          congestion: 70,
          name: 'Updated Traffic Area'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.congestion).toBe(70);
      expect(res.body.name).toBe('Updated Traffic Area');
    });

    test('PUT /api/traffic - Bulk update traffic areas', async () => {
      const res = await request(app)
        .put('/api/traffic')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          areas: [
            { id: trafficAreaId, congestion: 55 }
          ]
        });

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.areas)).toBe(true);
    });

    test('DELETE /api/traffic/:id - Delete traffic area', async () => {
      const res = await request(app)
        .delete(`/api/traffic/${trafficAreaId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
    });

    test('GET /api/traffic/:id - Confirm traffic area is deleted', async () => {
      const res = await request(app).get(`/api/traffic/${trafficAreaId}`);

      expect(res.statusCode).toBe(404);
    });
  });

  // ===== TRANSIT CRUD =====
  describe('Transit CRUD', () => {
    test('POST /api/transit/stops - Create transit stop', async () => {
      const res = await request(app)
        .post('/api/transit/stops')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Stop',
          line: 'Bus 42',
          lat: 37.7749,
          lng: -122.4194,
          status: 'On time',
          nextArrivalMin: 5
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.name).toBe('Test Stop');
      expect(res.body.line).toBe('Bus 42');

      transitStopId = res.body.id;
    });

    test('GET /api/transit/stops - Read all transit stops', async () => {
      const res = await request(app).get('/api/transit/stops');

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.stops)).toBe(true);
    });

    test('PUT /api/transit/stops/:id - Update transit stop', async () => {
      const res = await request(app)
        .put(`/api/transit/stops/${transitStopId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'Delayed 5m',
          nextArrivalMin: 10
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('Delayed 5m');
      expect(res.body.nextArrivalMin).toBe(10);
    });

    test('DELETE /api/transit/stops/:id - Delete transit stop', async () => {
      const res = await request(app)
        .delete(`/api/transit/stops/${transitStopId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
    });
  });

  // ===== AUTHORIZATION TESTS =====
  describe('Authorization Tests', () => {
    let otherUserToken;
    let otherUserRoute;

    beforeAll(async () => {
      // Create another user
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: OTHER_EMAIL,
          password: 'otherpass123',
          name: 'Other User'
        });

      otherUserToken = registerRes.body.token;

      // First user creates a route
      const routeRes = await request(app)
        .post('/api/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          originAddress: 'Start',
          originLat: 37.7749,
          originLng: -122.4194,
          destAddress: 'End',
          destLat: 37.7849,
          destLng: -122.4094,
          distanceKm: 5.0,
          durationMin: 10
        });

      otherUserRoute = routeRes.body.id;
    });

    test('DELETE /api/routes/saved/:id - Reject deletion by non-owner', async () => {
      const res = await request(app)
        .delete(`/api/routes/saved/${otherUserRoute}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBe('Access denied');
    });

    test('PUT /api/routes/saved/:id - Reject update by non-owner', async () => {
      const res = await request(app)
        .put(`/api/routes/saved/${otherUserRoute}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ durationMin: 20 });

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBe('Access denied');
    });

    test('GET /api/routes/saved/:id - Reject read by non-owner', async () => {
      const res = await request(app)
        .get(`/api/routes/saved/${otherUserRoute}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBe('Access denied');
    });
  });

  // ===== ROUTE QUERY TESTS =====
  describe('Route Queries', () => {
    test('GET /api/routes - Query routes (mock data)', async () => {
      const res = await request(app)
        .get('/api/routes?origin=San+Francisco&dest=Oakland');

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.routes)).toBe(true);
      expect(res.body.routes.length).toBeGreaterThan(0);
    }, 10000);  // 10 second timeout for OSRM API call

    test('GET /api/routes - Reject missing origin', async () => {
      const res = await request(app)
        .get('/api/routes?dest=Oakland');

      expect(res.statusCode).toBe(400);
    });

    test('GET /api/routes - Reject missing destination', async () => {
      const res = await request(app)
        .get('/api/routes?origin=San+Francisco');

      expect(res.statusCode).toBe(400);
    });
  });
});
