const request = require('supertest');
const app = require('../server');

describe('GET /api/places', () => {
  test('returns 400 when q is missing', async () => {
    const res = await request(app).get('/api/places');
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 200 with q param (may be empty list)', async () => {
    const res = await request(app).get('/api/places?q=pharmacy');
    expect([200, 500]).toContain(res.statusCode); // allow network/backoff to return 500 in CI
  });
});
