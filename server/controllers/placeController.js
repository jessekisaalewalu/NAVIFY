const axios = require('axios');

// Search for places (POIs). Prefer Geoapify when API key is configured, fallback to Nominatim.
async function searchPlaces(req, res, next){
  try{
    const q = (req.query.q || '').trim();
    const country = (req.query.country && req.query.country !== 'ALL') ? req.query.country : null;
    const limit = Math.min(parseInt(req.query.limit || '10', 10) || 10, 50);

    if(!q) return res.status(400).json({ error: 'Missing query parameter `q`' });

    // Use Geoapify if configured
    const geoKey = process.env.GEOAPIFY_API_KEY;
    if(geoKey){
      const url = 'https://api.geoapify.com/v2/places';
      const params = {
        apiKey: geoKey,
        text: q,
        limit,
        format: 'json'
      };
      if(country) params.filter = `countrycode:${country.toLowerCase()}`;
      const resp = await axios.get(url, { params, timeout: 8000 });
      const features = resp.data.features || [];
      const places = features.map(f => ({
        id: f.properties.place_id || f.properties.osm_id || f.id,
        name: f.properties.name || f.properties.formatted || q,
        lat: f.geometry && f.geometry.coordinates ? f.geometry.coordinates[1] : null,
        lng: f.geometry && f.geometry.coordinates ? f.geometry.coordinates[0] : null,
        category: f.properties.categories || f.properties.type || null,
        address: f.properties.formatted || f.properties.address_line1 || null,
        raw: f.properties
      }));

      return res.json({ places });
    }

    // Fallback to Nominatim
    const nomUrl = 'https://nominatim.openstreetmap.org/search';
    const params = {
      q,
      format: 'json',
      addressdetails: 1,
      limit
    };
    if(country) params.countrycodes = country.toLowerCase();
    const nomRes = await axios.get(nomUrl, { params, headers: { 'User-Agent': 'Navify/1.0 (your@email)' }, timeout: 8000 });
    const places = (nomRes.data || []).map(item => ({
      id: item.place_id || `${item.lat},${item.lon}`,
      name: item.display_name.split(',')[0] || item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      category: item.type || null,
      address: item.display_name,
      raw: item
    }));

    return res.json({ places });
  }catch(err){
    next(err);
  }
}

module.exports = { searchPlaces };
