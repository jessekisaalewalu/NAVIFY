const { db } = require('../config/database');

class TransitStop {
  static async findAll() {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM transit_stops ORDER BY name, line', [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static async findNearby(lat, lng, radiusKm = 5) {
    // Simple distance calculation (for production, use proper geospatial queries)
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT *, 
         (6371 * acos(cos(radians(?)) * cos(radians(lat)) * 
         cos(radians(lng) - radians(?)) + sin(radians(?)) * sin(radians(lat)))) AS distance
         FROM transit_stops
         HAVING distance < ?
         ORDER BY distance
         LIMIT 10`,
        [lat, lng, lat, radiusKm],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  }

  static async create(stopData) {
    const { name, line, lat, lng, status, nextArrivalMin } = stopData;
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO transit_stops (name, line, lat, lng, status, next_arrival_min)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [name, line, lat, lng, status || 'On time', nextArrivalMin || null],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id: this.lastID, ...stopData });
          }
        }
      );
    });
  }

  static async update(id, updates) {
    const fields = [];
    const values = [];

    Object.keys(updates).forEach(key => {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      fields.push(`${dbKey} = ?`);
      values.push(updates[key]);
    });

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE transit_stops SET ${fields.join(', ')} WHERE id = ?`,
        values,
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id, ...updates });
          }
        }
      );
    });
  }

  static async delete(id) {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM transit_stops WHERE id = ?', [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ deleted: this.changes > 0 });
        }
      });
    });
  }
}

module.exports = TransitStop;

