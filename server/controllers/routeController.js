const Route = require('../models/Route');
const axios = require('axios');
const shortid = require('shortid');
const TrafficArea = require('../models/TrafficArea');
const { geocodeAddress, parseLatLng } = require('../utils/geocode');

const MAPS_KEY = process.env.MAPS_API_KEY || null;
const GEOAPIFY_KEY = process.env.GEOAPIFY_API_KEY || null;

async function resolveLocation(input) {
  if (!input) return null;
  const parsed = parseLatLng(input);
  if (parsed) {
    return parsed;
  }
  return await geocodeAddress(input);
}

const getRoutes = async (req, res, next) => {
  try {
    const { origin, dest } = req.query;

    // Try Geoapify first if API key is available
    if (GEOAPIFY_KEY) {
      try {
        let originCoords = origin;
        let destCoords = dest;

        if (!/^-?\d+\.?\d*,-?\d+\.?\d*$/.test(origin)) {
          const originLoc = await geocodeAddress(origin);
          if (!originLoc) {
            return res.status(400).json({ error: 'Could not find origin address' });
          }
          originCoords = `${originLoc.lat},${originLoc.lng}`;
        }

        if (!/^-?\d+\.?\d*,-?\d+\.?\d*$/.test(dest)) {
          const destLoc = await geocodeAddress(dest);
          if (!destLoc) {
            return res.status(400).json({ error: 'Could not find destination address' });
          }
          destCoords = `${destLoc.lat},${destLoc.lng}`;
        }

        const routingUrl = 'https://api.geoapify.com/v1/routing';
        const waypoints = `${originCoords}|${destCoords}`;

        const response = await axios.get(routingUrl, {
          params: {
            waypoints: waypoints,
            mode: 'drive',
            apiKey: GEOAPIFY_KEY,
            details: 'instruction_details'
          }
        });

        if (response.data && response.data.features && response.data.features.length > 0) {
          const originParts = originCoords.split(',');
          const destParts = destCoords.split(',');
          const originLocation = { lat: parseFloat(originParts[0]), lng: parseFloat(originParts[1]) };
          const destLocation = { lat: parseFloat(destParts[0]), lng: parseFloat(destParts[1]) };

          const routes = response.data.features.map((feature, idx) => {
            const props = feature.properties;
            const distanceKm = (props.distance / 1000).toFixed(1);
            const durationMin = Math.round(props.time / 60);

            const steps = props.legs ? props.legs.flatMap(leg =>
              leg.steps ? leg.steps.map(step => ({
                instruction: step.instruction || step.instruction_text || 'Continue',
                distance: `${(step.distance / 1000).toFixed(2)} km`,
                duration: `${Math.round(step.time / 60)} min`
              })) : []
            ) : [];

            let geometry = feature.geometry;
            if (!geometry || !geometry.coordinates || geometry.coordinates.length === 0) {
              geometry = {
                type: 'LineString',
                coordinates: [
                  [originLocation.lng, originLocation.lat],
                  [destLocation.lng, destLocation.lat]
                ]
              };
            }

            return {
              id: shortid.generate(),
              name: idx === 0 ? '⭐ Fastest Route' : `Route Option ${idx + 1}`,
              summary: props.mode || 'Driving route',
              distance_km: parseFloat(distanceKm),
              distance_text: `${distanceKm} km`,
              eta_min: durationMin,
              duration_text: `${durationMin} min`,
              steps: steps,
              geometry: geometry,
              waypoints: waypoints,
              origin_location: originLocation,
              dest_location: destLocation
            };
          });

          res.json({
            origin,
            dest,
            origin_location: originLocation,
            dest_location: destLocation,
            generated: Date.now(),
            routes,
            status: 'OK',
            provider: 'geoapify'
          });
          return;
        }
      } catch (error) {
        console.error('Geoapify routing error:', error.message);
      }
    }

    // Fallback to Google Maps
    if (MAPS_KEY) {
      try {
        const directionsUrl = 'https://maps.googleapis.com/maps/api/directions/json';
        const response = await axios.get(directionsUrl, {
          params: {
            origin: origin,
            destination: dest,
            alternatives: true,
            key: MAPS_KEY,
            units: 'metric'
          }
        });

        if (response.data.status === 'OK' && response.data.routes && response.data.routes.length > 0) {
          const routes = response.data.routes.map((route, idx) => {
            const leg = route.legs[0];
            const distanceKm = (leg.distance.value / 1000).toFixed(1);
            const durationMin = Math.round(leg.duration.value / 60);
            const steps = leg.steps.map(step => ({
              instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
              distance: step.distance.text,
              duration: step.duration.text
            }));

            return {
              id: shortid.generate(),
              name: idx === 0 ? 'Fastest Route' : `Alternative ${idx}`,
              summary: route.summary || 'Route',
              distance_km: parseFloat(distanceKm),
              distance_text: leg.distance.text,
              eta_min: durationMin,
              duration_text: leg.duration.text,
              steps: steps,
              polyline: route.overview_polyline.points,
              bounds: route.bounds
            };
          });

          res.json({
            origin,
            dest,
            generated: Date.now(),
            routes,
            status: 'OK',
            provider: 'google'
          });
          return;
        }
      } catch (error) {
        console.error('Google Directions API error:', error.message);
      }
    }

    // Final fallback to mock data with simple geometry
    const areas = await TrafficArea.findAll();
    const avgCong = areas.length > 0
      ? Math.round(areas.reduce((s, a) => s + a.congestion, 0) / areas.length)
      : 50;
    const baseFast = 8 + Math.round(avgCong / 8);

    const originLoc = await resolveLocation(origin);
    const destLoc = await resolveLocation(dest);

    const geometry = (originLoc && destLoc)
      ? {
          type: 'LineString',
          coordinates: [
            [originLoc.lng, originLoc.lat],
            [destLoc.lng, destLoc.lat]
          ]
        }
      : null;

    const routes = [
      {
        id: shortid.generate(),
        name: 'Fastest',
        distance_km: 6.2,
        eta_min: Math.max(6, baseFast + Math.round(Math.random() * 6)),
        geometry
      },
      {
        id: shortid.generate(),
        name: 'Balanced',
        distance_km: 7.4,
        eta_min: Math.max(8, baseFast + 4 + Math.round(Math.random() * 8)),
        geometry
      },
      {
        id: shortid.generate(),
        name: 'Scenic (avoid highway)',
        distance_km: 9.8,
        eta_min: Math.max(10, baseFast + 8 + Math.round(Math.random() * 10)),
        geometry
      }
    ];

    res.json({
      origin,
      dest,
      origin_location: originLoc || null,
      dest_location: destLoc || null,
      generated: Date.now(),
      routes,
      mock: true
    });
  } catch (error) {
    next(error);
  }
};

const saveRoute = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const routeData = {
      userId,
      ...req.body
    };

    const route = await Route.create(routeData);
    res.status(201).json(route);
  } catch (error) {
    next(error);
  }
};

const getSavedRoutes = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const routes = await Route.findByUserId(userId);
    // normalize DB fields (snake_case) to camelCase for client
    const normalized = routes.map(r => ({
      id: r.id,
      userId: r.user_id || r.userId,
      originAddress: r.origin_address || r.originAddress,
      originLat: r.origin_lat || r.originLat,
      originLng: r.origin_lng || r.originLng,
      destAddress: r.dest_address || r.destAddress,
      destLat: r.dest_lat || r.destLat,
      destLng: r.dest_lng || r.destLng,
      distanceKm: r.distance_km || r.distanceKm,
      durationMin: r.duration_min || r.durationMin,
      routeData: r.route_data || r.routeData
    }));
    res.json({ routes: normalized });
  } catch (error) {
    next(error);
  }
};

const getSavedRoute = async (req, res, next) => {
  try {
    const { id } = req.params;
    const route = await Route.findById(id);

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    if (route.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const normalized = {
      id: route.id,
      userId: route.user_id || route.userId,
      originAddress: route.origin_address || route.originAddress,
      originLat: route.origin_lat || route.originLat,
      originLng: route.origin_lng || route.originLng,
      destAddress: route.dest_address || route.destAddress,
      destLat: route.dest_lat || route.destLat,
      destLng: route.dest_lng || route.destLng,
      distanceKm: route.distance_km || route.distanceKm,
      durationMin: route.duration_min || route.durationMin,
      routeData: route.route_data || route.routeData
    };

    res.json(normalized);
  } catch (error) {
    next(error);
  }
};

const deleteSavedRoute = async (req, res, next) => {
  try {
    const { id } = req.params;
    const route = await Route.findById(id);

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    if (route.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await Route.delete(id);
    res.json({ message: 'Route deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const updateSavedRoute = async (req, res, next) => {
  try {
    const { id } = req.params;
    const route = await Route.findById(id);

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    if (route.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updatedRoute = await Route.update(id, req.body);
    res.json(updatedRoute);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRoutes,
  saveRoute,
  getSavedRoutes,
  getSavedRoute,
  updateSavedRoute,
  deleteSavedRoute
};

