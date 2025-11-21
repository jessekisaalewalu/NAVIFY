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

// Global routing using OSRM (Open Source Routing Machine) - works worldwide, no API key needed
async function getRoutesWithOSRM(originLoc, destLoc, originName, destName) {
  try {
    if (!originLoc || !destLoc) return null;
    
    // OSRM uses lng,lat format
    const coordinates = `${originLoc.lng},${originLoc.lat};${destLoc.lng},${destLoc.lat}`;
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordinates}`;
    
    const response = await axios.get(osrmUrl, {
      params: {
        overview: 'full',
        steps: 'true',
        geometries: 'geojson',
        continue_straight: 'default'
      },
      timeout: 3000  // Reduced timeout to 3 seconds for OSRM
    });

    if (response.data && response.data.routes && response.data.routes.length > 0) {
      const routes = response.data.routes.map((route, idx) => {
        const distanceKm = (route.distance / 1000).toFixed(1);
        const durationMin = Math.round(route.duration / 60);
        
        const steps = route.legs.flatMap(leg =>
          leg.steps.map(step => ({
            instruction: step.maneuver?.instruction || step.name || 'Continue',
            distance: `${(step.distance / 1000).toFixed(2)} km`,
            duration: `${Math.round(step.duration / 60)} min`,
            name: step.name
          }))
        );

        return {
          id: shortid.generate(),
          name: idx === 0 ? '⭐ Fastest Route' : `Route Option ${idx + 1}`,
          summary: `Driving via ${route.legs.map(l => l.summary || '').join(' - ')}`,
          distance_km: parseFloat(distanceKm),
          distance_text: `${distanceKm} km`,
          eta_min: durationMin,
          duration_text: `${durationMin} min`,
          steps: steps,
          geometry: route.geometry,
          origin_location: originLoc,
          dest_location: destLoc,
          provider: 'osrm'
        };
      });

      return {
        origin: originName,
        dest: destName,
        origin_location: originLoc,
        dest_location: destLoc,
        generated: Date.now(),
        routes,
        status: 'OK',
        provider: 'osrm'
      };
    }
  } catch (error) {
    console.error('OSRM routing error:', error.message);
  }
  return null;
}

const getRoutes = async (req, res, next) => {
  try {
    const { origin, dest } = req.query;

    // Step 1: Resolve origin and destination to coordinates
    let originLoc = await resolveLocation(origin);
    let destLoc = await resolveLocation(dest);

    if (!originLoc) {
      return res.status(400).json({ error: 'Could not find origin address. Try a more specific address or coordinates (lat,lng).' });
    }
    if (!destLoc) {
      return res.status(400).json({ error: 'Could not find destination address. Try a more specific address or coordinates (lat,lng).' });
    }

    // Step 2: Try OSRM first (Global, free, no API key needed) ✅
    let osrmResult = await getRoutesWithOSRM(originLoc, destLoc, origin, dest);
    if (osrmResult) {
      return res.json(osrmResult);
    }

    // Step 3: Fallback to Geoapify if OSRM fails
    if (GEOAPIFY_KEY) {
      try {
        const routingUrl = 'https://api.geoapify.com/v1/routing';
        const waypoints = `${originLoc.lat},${originLoc.lng}|${destLoc.lat},${destLoc.lng}`;

        const response = await axios.get(routingUrl, {
          params: {
            waypoints: waypoints,
            mode: 'drive',
            apiKey: GEOAPIFY_KEY,
            details: 'instruction_details'
          }
        });

        if (response.data && response.data.features && response.data.features.length > 0) {
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
                  [originLoc.lng, originLoc.lat],
                  [destLoc.lng, destLoc.lat]
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
              origin_location: originLoc,
              dest_location: destLoc,
              provider: 'geoapify'
            };
          });

          return res.json({
            origin,
            dest,
            origin_location: originLoc,
            dest_location: destLoc,
            generated: Date.now(),
            routes,
            status: 'OK',
            provider: 'geoapify'
          });
        }
      } catch (error) {
        console.error('Geoapify routing error:', error.message);
      }
    }

    // Step 4: Fallback to Google Maps
    if (MAPS_KEY) {
      try {
        const directionsUrl = 'https://maps.googleapis.com/maps/api/directions/json';
        const response = await axios.get(directionsUrl, {
          params: {
            origin: `${originLoc.lat},${originLoc.lng}`,
            destination: `${destLoc.lat},${destLoc.lng}`,
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
              name: idx === 0 ? '⭐ Fastest Route' : `Alternative ${idx}`,
              summary: route.summary || 'Route',
              distance_km: parseFloat(distanceKm),
              distance_text: leg.distance.text,
              eta_min: durationMin,
              duration_text: leg.duration.text,
              steps: steps,
              polyline: route.overview_polyline.points,
              bounds: route.bounds,
              provider: 'google'
            };
          });

          return res.json({
            origin,
            dest,
            origin_location: originLoc,
            dest_location: destLoc,
            generated: Date.now(),
            routes,
            status: 'OK',
            provider: 'google'
          });
        }
      } catch (error) {
        console.error('Google Directions API error:', error.message);
      }
    }

    // Step 5: Final fallback - return mock data with real coordinates
    const areas = await TrafficArea.findAll();
    const avgCong = areas.length > 0
      ? Math.round(areas.reduce((s, a) => s + a.congestion, 0) / areas.length)
      : 50;
    const baseFast = 8 + Math.round(avgCong / 8);

    const geometry = {
      type: 'LineString',
      coordinates: [
        [originLoc.lng, originLoc.lat],
        [destLoc.lng, destLoc.lat]
      ]
    };

    // Calculate actual distance using Haversine formula
    const distanceKm = haversineDistance(originLoc.lat, originLoc.lng, destLoc.lat, destLoc.lng);
    const estimatedMinutes = Math.max(6, baseFast + Math.round((distanceKm / 50) * 60));

    const routes = [
      {
        id: shortid.generate(),
        name: '⭐ Fastest Route',
        distance_km: distanceKm,
        distance_text: `${distanceKm.toFixed(1)} km`,
        eta_min: estimatedMinutes,
        duration_text: `${estimatedMinutes} min`,
        geometry,
        origin_location: originLoc,
        dest_location: destLoc,
        provider: 'fallback'
      },
      {
        id: shortid.generate(),
        name: 'Scenic Route',
        distance_km: distanceKm * 1.2,
        distance_text: `${(distanceKm * 1.2).toFixed(1)} km`,
        eta_min: Math.round(estimatedMinutes * 1.3),
        duration_text: `${Math.round(estimatedMinutes * 1.3)} min`,
        geometry,
        origin_location: originLoc,
        dest_location: destLoc,
        provider: 'fallback'
      }
    ];

    res.json({
      origin,
      dest,
      origin_location: originLoc,
      dest_location: destLoc,
      generated: Date.now(),
      routes,
      status: 'OK',
      provider: 'fallback (mock)',
      note: 'Using estimated route. For more accurate results, configure OSRM, Geoapify, or Google Maps API.'
    });

  } catch (error) {
    console.error('getRoutes error:', error);
    next(error);
  }
};

// Helper function to calculate distance between two points (Haversine formula)
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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

