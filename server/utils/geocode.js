const axios = require('axios');

const MAPS_KEY = process.env.MAPS_API_KEY || null;
const GEOAPIFY_KEY = process.env.GEOAPIFY_API_KEY || null;

async function geocodeWithGoogle(address, country) {
  if (!MAPS_KEY) return null;
  try {
    const geocodeUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
    const params = { address, key: MAPS_KEY };
    // If a country code (ISO2) is provided, use components to bias to that country
    if (country && country.length === 2) {
      params.components = `country:${country}`;
    }
    const response = await axios.get(geocodeUrl, { params });
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

async function geocodeWithGeoapify(address, country) {
  if (!GEOAPIFY_KEY) return null;
  try {
    const geocodeUrl = 'https://api.geoapify.com/v1/geocode/search';
    const params = { text: address, apiKey: GEOAPIFY_KEY, limit: 1 };
    // Geoapify supports filtering by country code
    if (country && country.length === 2) {
      params.filter = `countrycode:${country.toLowerCase()}`;
    }
    const response = await axios.get(geocodeUrl, { params });
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

async function geocodeWithNominatim(address, country) {
  try {
    const params = {
      format: 'json',
      q: address,
      limit: 1
    };
    // Nominatim supports countrycodes (comma-separated ISO2)
    if (country && country.length === 2) params.countrycodes = country.toLowerCase();
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params,
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

async function geocodeAddress(address, country) {
  // Try providers in order, passing country where supported
  return (
    (await geocodeWithGeoapify(address, country)) ||
    (await geocodeWithGoogle(address, country)) ||
    (await geocodeWithNominatim(address, country))
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


