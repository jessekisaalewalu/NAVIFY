const TripLog = require('../models/TripLog');
const User = require('../models/User');

// Accept a trip log POST from client. If Authorization JWT present, attach user id.
async function createTrip(req, res, next){
  try{
    const body = req.body || {};
    let userId = null;
    // If authenticated, middleware may have set req.user; otherwise try to parse token
    if(req.user && req.user.id) userId = req.user.id;

    const trip = {
      userId,
      originLat: body.originLat || body.origin_lat || null,
      originLng: body.originLng || body.origin_lng || null,
      destLat: body.destLat || body.dest_lat || null,
      destLng: body.destLng || body.dest_lng || null,
      startTs: body.startTs || body.start_ts || null,
      endTs: body.endTs || body.end_ts || null,
      durationSec: body.durationSec || body.duration_sec || null,
      distanceKm: body.distanceKm || body.distance_km || null,
      anonymized: body.anonymized !== undefined ? (body.anonymized ? 1 : 0) : 1,
      meta: body.meta || null
    };

    const created = await TripLog.create(trip);
    res.status(201).json({ ok: true, trip: created });
  }catch(err){ next(err); }
}

async function getMyTrips(req, res, next){
  try{
    const user = req.user;
    if(!user || !user.id) return res.status(401).json({ error: 'Unauthorized' });
    const trips = await TripLog.findByUserId(user.id);
    res.json({ trips });
  }catch(err){ next(err); }
}

module.exports = { createTrip, getMyTrips };
