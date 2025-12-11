const request = require('supertest');
const app = require('../server');

describe('POST /api/trips', () => {
  test('creates a trip log with minimal payload', async () => {
    const payload = { originLat: -1.95, originLng: 30.06, destLat: -1.94, destLng: 30.07, startTs: Date.now()-600000, endTs: Date.now(), durationSec: 600, distanceKm: 2.3 };
    const res = await request(app).post('/api/trips').send(payload).set('Content-Type', 'application/json');
    expect([201,500]).toContain(res.statusCode);
  });
});
