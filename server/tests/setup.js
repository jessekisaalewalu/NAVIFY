// Test setup file
const { initializeDatabase, seedTrafficData } = require('../config/database');

beforeAll(async () => {
  await initializeDatabase();
  await seedTrafficData();
});

afterAll(async () => {
  // Cleanup if needed
});

