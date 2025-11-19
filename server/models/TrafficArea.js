const { db } = require('../config/database');

class TrafficArea {
  static async findAll() {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM traffic_areas ORDER BY name', [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static async findById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM traffic_areas WHERE id = ?', [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  static async create(areaData) {
    const { id, name, congestion, lat, lng } = areaData;
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO traffic_areas (id, name, congestion, lat, lng) VALUES (?, ?, ?, ?, ?)',
        [id, name, congestion || 0, lat || null, lng || null],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id, name, congestion, lat, lng });
          }
        }
      );
    });
  }

  static async update(id, updates) {
    const { name, congestion, lat, lng } = updates;
    const fields = [];
    const values = [];

    if (name !== undefined) {
      fields.push('name = ?');
      values.push(name);
    }
    if (congestion !== undefined) {
      fields.push('congestion = ?');
      values.push(congestion);
    }
    if (lat !== undefined) {
      fields.push('lat = ?');
      values.push(lat);
    }
    if (lng !== undefined) {
      fields.push('lng = ?');
      values.push(lng);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE traffic_areas SET ${fields.join(', ')} WHERE id = ?`,
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

  static async updateBulk(areas) {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare('UPDATE traffic_areas SET congestion = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      
      areas.forEach(area => {
        stmt.run(area.congestion, area.id);
      });
      
      stmt.finalize((err) => {
        if (err) {
          reject(err);
        } else {
          resolve(areas);
        }
      });
    });
  }

  static async delete(id) {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM traffic_areas WHERE id = ?', [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ deleted: this.changes > 0 });
        }
      });
    });
  }
}

module.exports = TrafficArea;

