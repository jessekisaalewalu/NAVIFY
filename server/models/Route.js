const { db } = require('../config/database');
const shortid = require('shortid');

class Route {
  static async create(routeData) {
    const {
      userId,
      originAddress,
      originLat,
      originLng,
      destAddress,
      destLat,
      destLng,
      distanceKm,
      durationMin,
      routeData: routeJson
    } = routeData;

    const id = shortid.generate();

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO routes (id, user_id, origin_address, origin_lat, origin_lng, 
         dest_address, dest_lat, dest_lng, distance_km, duration_min, route_data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, userId, originAddress, originLat, originLng,
          destAddress, destLat, destLng, distanceKm, durationMin,
          routeJson ? JSON.stringify(routeJson) : null
        ],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id, ...routeData });
          }
        }
      );
    });
  }

  static async findByUserId(userId) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM routes WHERE user_id = ? ORDER BY created_at DESC',
        [userId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            const routes = rows.map(row => ({
              ...row,
              route_data: row.route_data ? JSON.parse(row.route_data) : null
            }));
            resolve(routes);
          }
        }
      );
    });
  }

  static async findById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM routes WHERE id = ?', [id], (err, row) => {
        if (err) {
          reject(err);
        } else if (!row) {
          resolve(null);
        } else {
          resolve({
            ...row,
            route_data: row.route_data ? JSON.parse(row.route_data) : null
          });
        }
      });
    });
  }

  static async update(id, updates) {
    const fields = [];
    const values = [];

    Object.keys(updates).forEach(key => {
      if (key === 'routeData') {
        fields.push('route_data = ?');
        values.push(JSON.stringify(updates[key]));
      } else {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${dbKey} = ?`);
        values.push(updates[key]);
      }
    });

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE routes SET ${fields.join(', ')} WHERE id = ?`,
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
      db.run('DELETE FROM routes WHERE id = ?', [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ deleted: this.changes > 0 });
        }
      });
    });
  }
}

module.exports = Route;

