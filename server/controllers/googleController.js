const https = require('https');

function getJson(url){
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let raw = '';
      res.on('data', (chunk) => raw += chunk);
      res.on('end', () => {
        try{ resolve(JSON.parse(raw)); }catch(e){ reject(e); }
      });
    }).on('error', reject);
  });
}

async function places(req, res, next){
  try{
    const key = process.env.MAPS_API_KEY;
    if(!key) return res.status(400).json({ error: 'Google Maps API key not configured' });
    const q = req.query.query || req.query.q || '';
    const country = req.query.country || '';
    if(!q) return res.status(400).json({ error: 'query required' });

    // Use Places Text Search to find a place and photos
    const region = country ? `&region=${encodeURIComponent(country)}` : '';
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q)}${region}&key=${key}`;
    const data = await getJson(url);
    // Return simplified first N results
    const results = (data.results || []).slice(0,6).map(r => ({
      name: r.name,
      formatted_address: r.formatted_address,
      place_id: r.place_id,
      photos: r.photos || [],
      lat: r.geometry && r.geometry.location ? r.geometry.location.lat : null,
      lng: r.geometry && r.geometry.location ? r.geometry.location.lng : null
    }));
    res.json({ results });
  }catch(err){ next(err); }
}

function proxyGet(url, clientRes){
  https.get(url, (upRes) => {
    // Follow redirects if any
    if(upRes.statusCode >= 300 && upRes.statusCode < 400 && upRes.headers.location){
      https.get(upRes.headers.location, (finalRes) => {
        clientRes.writeHead(finalRes.statusCode, finalRes.headers);
        finalRes.pipe(clientRes);
      }).on('error', (e) => clientRes.status(502).end('failed to fetch'));
      return;
    }
    clientRes.writeHead(upRes.statusCode, upRes.headers);
    upRes.pipe(clientRes);
  }).on('error', (e) => clientRes.status(502).end('failed to fetch'));
}

function photo(req, res, next){
  try{
    const key = process.env.MAPS_API_KEY;
    if(!key) return res.status(400).json({ error: 'Google Maps API key not configured' });
    const ref = req.query.ref || req.query.photoreference || req.query.photo_reference;
    const maxwidth = req.query.maxwidth || 800;
    if(!ref) return res.status(400).json({ error: 'photo reference required' });
    const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${encodeURIComponent(maxwidth)}&photoreference=${encodeURIComponent(ref)}&key=${encodeURIComponent(key)}`;
    // Proxy the request and follow redirects
    proxyGet(url, res);
  }catch(err){ next(err); }
}

module.exports = { places, photo };