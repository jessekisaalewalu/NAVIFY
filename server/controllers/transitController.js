const TransitStop = require('../models/TransitStop');
const TrafficArea = require('../models/TrafficArea');
const axios = require('axios');

const MAPS_KEY = process.env.MAPS_API_KEY || null;

const getTransit = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;

    // If we have location and API key, try to get real transit data
    if (lat && lng && MAPS_KEY) {
      try {
        const placesUrl = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
        const placesResponse = await axios.get(placesUrl, {
          params: {
            location: `${lat},${lng}`,
            radius: 500,
            type: 'transit_station',
            key: MAPS_KEY
          }
        });

        if (placesResponse.data.results && placesResponse.data.results.length > 0) {
          const stops = placesResponse.data.results.slice(0, 3).map((place, idx) => ({
            line: place.name || `Transit Stop ${idx + 1}`,
            in_min: Math.max(2, 5 + idx * 5 + Math.round(Math.random() * 5)),
            status: Math.random() > 0.7 ? 'Delayed' : 'On time',
            location: place.vicinity || place.name
          }));
          return res.json({ stop: "Nearby Transit", next: stops, location: { lat, lng } });
        }
      } catch (error) {
        console.error('Transit API error:', error.message);
      }
    }

    // Try database first
    if (lat && lng) {
      try {
        const nearbyStops = await TransitStop.findNearby(parseFloat(lat), parseFloat(lng));
        if (nearbyStops.length > 0) {
          const stops = nearbyStops.map(stop => ({
            line: stop.line,
            in_min: stop.next_arrival_min || Math.max(2, 5 + Math.round(Math.random() * 5)),
            status: stop.status || 'On time',
            location: stop.name
          }));
          return res.json({ stop: "Nearby Transit", next: stops, location: { lat, lng } });
        }
      } catch (error) {
        console.error('Database transit query error:', error.message);
      }
    }

    // Fallback to mock data
    const areas = await TrafficArea.findAll();
    const hotspot = areas.filter(a => a.congestion > 60).map(a => a.name);
    const next = [
      { line: "Bus 12", in_min: Math.max(2, 5 + Math.round(hotspot.length * 2 - Math.random() * 3)), status: hotspot.length ? 'Delayed' : 'On time' },
      { line: "Bus 3", in_min: Math.max(4, 10 + Math.round(hotspot.length * 2 + Math.random() * 4)), status: Math.random() > 0.7 ? 'Delayed 3m' : 'On time' },
      { line: "Bus 5", in_min: Math.max(6, 15 + Math.round(hotspot.length * 3 + Math.random() * 6)), status: 'On time' }
    ];
    res.json({ stop: "Central Bus Stop", next });
  } catch (error) {
    next(error);
  }
};

const getTransitStops = async (req, res, next) => {
  try {
    const stops = await TransitStop.findAll();
    res.json({ stops });
  } catch (error) {
    next(error);
  }
};

const createTransitStop = async (req, res, next) => {
  try {
    const stop = await TransitStop.create(req.body);
    res.status(201).json(stop);
  } catch (error) {
    next(error);
  }
};

const updateTransitStop = async (req, res, next) => {
  try {
    const { id } = req.params;
    const stop = await TransitStop.update(id, req.body);
    res.json(stop);
  } catch (error) {
    next(error);
  }
};

const deleteTransitStop = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await TransitStop.delete(id);

    if (!result.deleted) {
      return res.status(404).json({ error: 'Transit stop not found' });
    }

    res.json({ message: 'Transit stop deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTransit,
  getTransitStops,
  createTransitStop,
  updateTransitStop,
  deleteTransitStop
};

