const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'navify.db');

// Create database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Initialize database tables
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          console.error('Error creating users table:', err);
          reject(err);
        }
      });

      // Traffic areas table
      db.run(`CREATE TABLE IF NOT EXISTS traffic_areas (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        congestion INTEGER NOT NULL DEFAULT 0,
        lat REAL,
        lng REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          console.error('Error creating traffic_areas table:', err);
          reject(err);
        }
      });

      // Routes table (saved routes by users)
      db.run(`CREATE TABLE IF NOT EXISTS routes (
        id TEXT PRIMARY KEY,
        user_id INTEGER,
        origin_address TEXT NOT NULL,
        origin_lat REAL,
        origin_lng REAL,
        dest_address TEXT NOT NULL,
        dest_lat REAL,
        dest_lng REAL,
        distance_km REAL,
        duration_min INTEGER,
        route_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`, (err) => {
        if (err) {
          console.error('Error creating routes table:', err);
          reject(err);
        }
      });

      // Transit stops table
      db.run(`CREATE TABLE IF NOT EXISTS transit_stops (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        line TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        status TEXT DEFAULT 'On time',
        next_arrival_min INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          console.error('Error creating transit_stops table:', err);
          reject(err);
        } else {
          // Trip logs table (opt-in trip logging)
          db.run(`CREATE TABLE IF NOT EXISTS trips (
            id TEXT PRIMARY KEY,
            user_id INTEGER,
            origin_lat REAL,
            origin_lng REAL,
            dest_lat REAL,
            dest_lng REAL,
            start_ts INTEGER,
            end_ts INTEGER,
            duration_sec INTEGER,
            distance_km REAL,
            anonymized INTEGER DEFAULT 1,
            meta TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )`, (err2) => {
            if (err2) {
              console.error('Error creating trips table:', err2);
              reject(err2);
            } else {
              console.log('Database tables initialized successfully');
              resolve();
            }
          });
        }
      });
    });
  });
}

// Seed initial traffic data
function seedTrafficData() {
  return new Promise((resolve, reject) => {
    const trafficData = require('../data/mock_traffic.json');
    const stmt = db.prepare('INSERT OR REPLACE INTO traffic_areas (id, name, congestion) VALUES (?, ?, ?)');
    
    trafficData.areas.forEach(area => {
      stmt.run(area.id, area.name, area.congestion);
    });
    
    stmt.finalize((err) => {
      if (err) {
        console.error('Error seeding traffic data:', err);
        reject(err);
      } else {
        console.log('Traffic data seeded successfully');
        resolve();
      }
    });
  });
}

module.exports = {
  db,
  initializeDatabase,
  seedTrafficData
};

