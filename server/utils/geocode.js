const axios = require('axios');

const MAPS_KEY = process.env.MAPS_API_KEY || null;
const GEOAPIFY_KEY = process.env.GEOAPIFY_API_KEY || null;

async function geocodeWithGoogle(address) {
  if (!MAPS_KEY) return null;
  try {
    const geocodeUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
    const response = await axios.get(geocodeUrl, {
      params: { address, key: MAPS_KEY }
    });
    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const result = response.data.results[0];
      return {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        address: result.formatted_address
      };
    }
  } catch (error) {
    console.error('Google geocoding error:', error.message);
  }
  return null;
}

async function geocodeWithGeoapify(address) {
  if (!GEOAPIFY_KEY) return null;
  try {
    const geocodeUrl = 'https://api.geoapify.com/v1/geocode/search';
    const response = await axios.get(geocodeUrl, {
      params: { text: address, apiKey: GEOAPIFY_KEY, limit: 1 }
    });
    if (response.data.features && response.data.features.length > 0) {
      const feature = response.data.features[0];
      return {
        lat: feature.geometry.coordinates[1],
        lng: feature.geometry.coordinates[0],
        address: feature.properties.formatted || address
      };
    }
  } catch (error) {
    console.error('Geoapify geocoding error:', error.message);
  }
  return null;
}

async function geocodeWithNominatim(address) {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        format: 'json',
        q: address,
        limit: 1
      },
      headers: {
        'User-Agent': 'NavifyApp/1.0'
      }
    });
    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        address: result.display_name || address
      };
    }
  } catch (error) {
    console.error('Nominatim geocoding error:', error.message);
  }
  return null;
}

async function geocodeAddress(address) {
  return (
    (await geocodeWithGeoapify(address)) ||
    (await geocodeWithGoogle(address)) ||
    (await geocodeWithNominatim(address))
  );
}

function parseLatLng(value) {
  if (!value) return null;
  const match = /^-?\d+\.?\d*,-?\d+\.?\d*$/.test(value);
  if (!match) return null;
  const [lat, lng] = value.split(',').map(parseFloat);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng, address: value };
}

module.exports = {
  geocodeAddress,
  parseLatLng
};


