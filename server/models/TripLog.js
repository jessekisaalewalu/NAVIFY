const { db } = require('../config/database');
const shortid = require('shortid');

class TripLog {
  static async create(trip) {
    const id = shortid.generate();
    const {
      userId = null,
      originLat = null,
      originLng = null,
      destLat = null,
      destLng = null,
      startTs = null,
      endTs = null,
      durationSec = null,
      distanceKm = null,
      anonymized = 1,
      meta = null
    } = trip;

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO trips (id, user_id, origin_lat, origin_lng, dest_lat, dest_lng, start_ts, end_ts, duration_sec, distance_km, anonymized, meta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, userId, originLat, originLng, destLat, destLng, startTs, endTs, durationSec, distanceKm, anonymized ? 1 : 0, meta ? JSON.stringify(meta) : null],
        function(err) {
          if (err) return reject(err);
          resolve({ id, ...trip });
        }
      );
    });
  }

  static async findByUserId(userId) {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM trips WHERE user_id = ? ORDER BY created_at DESC', [userId], (err, rows) => {
        if (err) return reject(err);
        const mapped = rows.map(r => ({ ...r, meta: r.meta ? JSON.parse(r.meta) : null }));
        resolve(mapped);
      });
    });
  }
}

module.exports = TripLog;
