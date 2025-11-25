const TrafficArea = require('../models/TrafficArea');

const getTraffic = async (req, res, next) => {
  try {
    const areas = await TrafficArea.findAll();
    res.json({
      timestamp: Date.now(),
      areas
    });
  } catch (error) {
    next(error);
  }
};

const getTrafficArea = async (req, res, next) => {
  try {
    const { id } = req.params;
    const area = await TrafficArea.findById(id);
    
    if (!area) {
      return res.status(404).json({ error: 'Traffic area not found' });
    }
    
    res.json(area);
  } catch (error) {
    next(error);
  }
};

const createTrafficArea = async (req, res, next) => {
  try {
    const area = await TrafficArea.create(req.body);
    res.status(201).json(area);
  } catch (error) {
    next(error);
  }
};

const updateTrafficArea = async (req, res, next) => {
  try {
    const { id } = req.params;
    const area = await TrafficArea.update(id, req.body);
    res.json(area);
  } catch (error) {
    next(error);
  }
};

const updateTrafficBulk = async (req, res, next) => {
  try {
    const { areas } = req.body;
    if (!Array.isArray(areas)) {
      return res.status(400).json({ error: 'Areas must be an array' });
    }
    
    await TrafficArea.updateBulk(areas);
    const updatedAreas = await TrafficArea.findAll();
    
    res.json({
      timestamp: Date.now(),
      areas: updatedAreas
    });
  } catch (error) {
    next(error);
  }
};

const deleteTrafficArea = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await TrafficArea.delete(id);
    
    if (!result.deleted) {
      return res.status(404).json({ error: 'Traffic area not found' });
    }
    
    res.json({ message: 'Traffic area deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// In-memory buffer for recent GPS pings (short lived)
const recentPings = [];
// Accept ping: { lat, lng, speed (km/h), timestamp }
const receivePing = async (req, res, next) => {
  try {
    const { lat, lng, speed, ts } = req.body;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ error: 'Invalid lat/lng' });
    }
    const entry = {
      lat,
      lng,
      speed: typeof speed === 'number' ? speed : null,
      ts: ts || Date.now()
    };
    // Keep recent pings for 2 minutes
    recentPings.push(entry);
    // Trim old pings
    const cutoff = Date.now() - 2 * 60 * 1000;
    while (recentPings.length > 0 && recentPings[0].ts < cutoff) recentPings.shift();
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
};

// Aggregate recent pings into grid cells and update TrafficArea table
async function aggregatePings() {
  try {
    if (recentPings.length === 0) return [];

    // Bucket pings into ~100m grid using lat/lng rounding
    const buckets = new Map();
    recentPings.forEach(p => {
      const keyLat = Math.round(p.lat * 1000) / 1000; // ~111m lat
      const keyLng = Math.round(p.lng * 1000) / 1000;
      const key = `${keyLat}:${keyLng}`;
      if (!buckets.has(key)) buckets.set(key, { lat: keyLat, lng: keyLng, speeds: [], count: 0 });
      const b = buckets.get(key);
      if (p.speed !== null && !Number.isNaN(p.speed)) b.speeds.push(p.speed);
      b.count += 1;
    });

    const updates = [];
    for (const [key, b] of buckets.entries()){
      // Estimate congestion: lower average speed -> higher congestion
      const avgSpeed = b.speeds.length > 0 ? (b.speeds.reduce((s,x)=>s+x,0)/b.speeds.length) : null;
      let congestion = 50;
      if (avgSpeed !== null){
        // Simple mapping: 0 km/h -> 95% congested, 60+ km/h -> 10%
        congestion = Math.round(Math.max(5, Math.min(95, 95 - (avgSpeed / 60) * 85)));
      } else {
        // If no speed, use count density as proxy
        congestion = Math.round(Math.max(5, Math.min(95, 50 + (b.count - 2) * 5)));
      }

      updates.push({ id: `cell_${key.replace(':','_')}`, name: `Cell ${b.lat.toFixed(3)},${b.lng.toFixed(3)}`, congestion, lat: b.lat, lng: b.lng });
    }

    // Persist updates into traffic_areas table (create or update)
    const existing = await TrafficArea.findAll();
    const existingIds = new Set(existing.map(e=>e.id));
    for (const u of updates){
      if (existingIds.has(u.id)){
        await TrafficArea.update(u.id, { congestion: u.congestion, lat: u.lat, lng: u.lng });
      } else {
        await TrafficArea.create(u);
      }
    }

    return updates;
  } catch (error) {
    console.error('aggregatePings error:', error);
    return [];
  }
}

module.exports = {
  getTraffic,
  getTrafficArea,
  createTrafficArea,
  updateTrafficArea,
  updateTrafficBulk,
  deleteTrafficArea,
  receivePing,
  aggregatePings
};

