const TripLog = require('../models/TripLog');
const TrafficArea = require('../models/TrafficArea');

async function summary(req, res, next){
  try{
    // Require auth middleware to set req.user (admin gating could be added)
    const trips = await (async()=>{
      // rough aggregation: count, avg duration, avg distance
      const all = await new Promise((resolve,reject)=>{
        const { db } = require('../config/database');
        db.all('SELECT duration_sec, distance_km FROM trips', [], (err, rows)=>{ if(err) reject(err); else resolve(rows); });
      });
      const count = all.length;
      const avgDuration = count ? Math.round(all.reduce((s,r)=>s+(r.duration_sec||0),0)/count) : 0;
      const avgDistance = count ? +(all.reduce((s,r)=>s+(r.distance_km||0),0)/count).toFixed(2) : 0;
      return { count, avgDuration, avgDistance };
    })();

    const areas = await TrafficArea.findAll();
    const hotspots = areas.sort((a,b)=>b.congestion - a.congestion).slice(0,10).map(a=>({ id:a.id, name:a.name, congestion:a.congestion }));

    res.json({ trips: trips.count, avgDurationSec: trips.avgDuration, avgDistanceKm: trips.avgDistance, hotspots });
  }catch(err){ next(err); }
}

module.exports = { summary };
