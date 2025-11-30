// client-side JS
// Supports: dynamic backend origin, socket.io realtime, Google Maps directions (if server provides MAPS_API_KEY), and graceful fallbacks.

// mark that JS is enabled so CSS can show slide animations
document.documentElement.classList.add('js');

// Use relative API URLs by default so frontend and backend can be served from the same host.
// If you are running the frontend separately during development and need to point
// to a different backend, set `window.__API_ORIGIN__ = 'http://localhost:3000'` before
// this script runs or change this value here.
const SERVER_ORIGIN = window.__API_ORIGIN__ || '';
function apiUrl(path){ return SERVER_ORIGIN ? `${SERVER_ORIGIN}${path}` : path; }

// Authentication state
let authToken = localStorage.getItem('authToken');
let currentUser = null;
function getAuthHeaders() {
  return authToken ? { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

// create socket if `io` is available, otherwise null
let socket = null;
if(typeof io !== 'undefined'){
  try{ socket = (SERVER_ORIGIN === '') ? io() : io(SERVER_ORIGIN); }catch(e){ console.warn('socket init failed', e); socket = null; }
} else {
  console.warn('socket.io client not loaded; continuing without realtime');
}

// tiny debug/status UI
function ensureStatusEl(){
  let el = document.getElementById('backendStatus');
  if(!el){
    el = document.createElement('div');
    el.id = 'backendStatus';
    el.style.fontSize='12px';
    el.style.color='var(--muted)';
    el.style.marginLeft='8px';
    const headerBrand = document.querySelector('.brand');
    if(headerBrand) headerBrand.appendChild(el);
  }

// Create a custom dropdown UI that mirrors the native select (for consistent styling)
function initCustomCountrySelect(selectEl){
  if(!selectEl) return;
  // If already initialized, skip
  if(selectEl.dataset.customized === '1') return;

  // Hide native select but keep it in DOM for form compatibility
  selectEl.style.position = 'absolute';
  selectEl.style.left = '-9999px';
  selectEl.tabIndex = -1;

  const wrapper = document.createElement('div');
  wrapper.className = 'custom-select';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'custom-select-button';
  btn.setAttribute('aria-haspopup','listbox');
  btn.setAttribute('aria-expanded','false');

  const labelSpan = document.createElement('span');
  labelSpan.className = 'custom-select-label';
  labelSpan.textContent = selectEl.options[selectEl.selectedIndex]?.text || 'All countries';

  const arrow = document.createElement('span');
  arrow.className = 'custom-select-arrow';
  arrow.innerHTML = '▾';

  btn.appendChild(labelSpan);
  btn.appendChild(arrow);
  wrapper.appendChild(btn);

  const list = document.createElement('div');
  list.className = 'custom-select-list';
  list.setAttribute('role','listbox');
  list.tabIndex = -1;

  // Build items from native select
  if(selectEl.options.length === 0){
    const empty = document.createElement('div'); empty.className='custom-select-empty'; empty.textContent='No countries'; list.appendChild(empty);
  } else {
    for(let i=0;i<selectEl.options.length;i++){
      const opt = selectEl.options[i];
      const item = document.createElement('div');
      item.className = 'custom-select-item';
      item.setAttribute('role','option');
      item.dataset.value = opt.value;
      item.textContent = opt.textContent;
      if(opt.disabled) item.setAttribute('aria-disabled','true');
      if(opt.selected) item.setAttribute('aria-selected','true');
      list.appendChild(item);
    }
  }

  wrapper.appendChild(list);
  selectEl.parentNode.insertBefore(wrapper, selectEl.nextSibling);
  selectEl.dataset.customized = '1';

  let open = false;
  let focusedIndex = -1;
  const items = Array.from(list.querySelectorAll('.custom-select-item'));

  function openList(){
    list.style.display = 'block';
    btn.setAttribute('aria-expanded','true');
    open = true; focusedIndex = items.findIndex(it=>it.getAttribute('aria-selected')==='true');
    highlight(focusedIndex);
  }
  function closeList(){
    list.style.display = 'none';
    btn.setAttribute('aria-expanded','false');
    open = false; removeHighlight();
  }
  function highlight(idx){
    items.forEach((it,i)=>{ it.classList.toggle('active', i===idx); });
    if(idx>=0 && items[idx]) items[idx].scrollIntoView({block:'nearest'});
  }
  function removeHighlight(){ items.forEach(it=>it.classList.remove('active')); }

  btn.addEventListener('click', (e)=>{
    e.preventDefault();
    if(open) closeList(); else openList();
  });

  // Click on item
  list.addEventListener('click', (e)=>{
    const it = e.target.closest('.custom-select-item');
    if(!it) return;
    const val = it.dataset.value;
    selectEl.value = val;
    // Update label
    labelSpan.textContent = it.textContent;
    // Mark aria-selected
    items.forEach(i=>i.setAttribute('aria-selected','false'));
    it.setAttribute('aria-selected','true');
    // Persist and trigger change
    localStorage.setItem('selectedCountry', val);
    selectEl.dispatchEvent(new Event('change', { bubbles: true }));
    closeList();
  });

  // Keyboard support
  btn.addEventListener('keydown', (e)=>{
    if(e.key === 'ArrowDown' || e.key === 'Down'){
      e.preventDefault(); if(!open) openList(); focusedIndex = Math.min(items.length-1, Math.max(0, focusedIndex+1)); highlight(focusedIndex);
    } else if(e.key === 'ArrowUp' || e.key === 'Up'){
      e.preventDefault(); if(!open) openList(); focusedIndex = Math.max(0, focusedIndex-1); highlight(focusedIndex);
    } else if(e.key === 'Enter'){
      e.preventDefault(); if(open && focusedIndex>=0){ items[focusedIndex].click(); } else openList();
    } else if(e.key === 'Escape'){
      e.preventDefault(); closeList();
    }
  });

  // Close when clicking outside
  document.addEventListener('click', (e)=>{ if(!wrapper.contains(e.target)) closeList(); });
}
  return el;
}
const statusEl = ensureStatusEl();
function setStatus(text, color){ if(statusEl){ statusEl.textContent = text; statusEl.style.color = color || 'var(--muted)'; }}
setStatus('connecting...');

function ensureDebug(){
  // Debug panel removed: return null so no bottom-right time/debug box is created.
  // Debug logging still goes to console; debug() is a no-op for DOM output.
  return null;
}
const debugEl = ensureDebug();
function debug(msg){ try{ console.log('[DEBUG]', msg); debugEl.textContent = `${new Date().toLocaleTimeString()} - ${msg}\n` + debugEl.textContent.slice(0,2000); }catch(e){} }
window.addEventListener('error', e => { debug('ERROR: '+(e.message||e)); });
window.addEventListener('unhandledrejection', e => { debug('PromiseRejection: '+(e.reason&&e.reason.message?e.reason.message:JSON.stringify(e.reason))); });

// Google Maps state (populated if server provides API key)
let googleMapsLoaded = false;
let map = null;
let leafletMap = null; // Fallback map using Leaflet
let userMarker = null;
let originMarker = null;
let destMarker = null;
let routePolyline = null;
let directionsService = null;
let directionsRenderer = null;
let watchId = null;
let userLocation = null;
let originAutocomplete = null;
let destAutocomplete = null;
let currentRoute = null;
let currentRouteSteps = [];
let currentRoutePolylinePoints = [];
let instructionsEl = null;

function loadGoogleMaps(key){
  return new Promise((resolve,reject)=>{
    if(window.google && window.google.maps){ googleMapsLoaded = true; return resolve(); }
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places`;
    s.defer = true; s.async = true;
    s.onload = ()=>{ googleMapsLoaded = true; debug('Google Maps loaded'); resolve(); };
    s.onerror = (err)=>{ debug('Google Maps load error'); reject(err); };
    document.head.appendChild(s);
  });
}

  // Load list of countries (uses restcountries API) and populate the country selector
  async function loadCountries(selectEl){
    if(!selectEl) return;
    try{
        // Try to load cached list first
        const cached = localStorage.getItem('countriesList');
        let countries = cached ? JSON.parse(cached) : null;

        // If not cached, try local static file first for reliability
        if(!countries){
          try{
            const localRes = await fetch('/data/countries.json');
            if(localRes.ok){
              const localData = await localRes.json();
              countries = localData.map(c=>({ name: c.name, code: c.code }));
            }
          }catch(errLocal){
            // ignore and try remote
          }
        }

        // If still not found, fallback to remote REST Countries API
        if(!countries){
          const res = await fetch('https://restcountries.com/v3.1/all');
          const data = await res.json();
          countries = data.map(c => ({ name: c.name.common, code: c.cca2 })).filter(c=>c.code);
        }

        // Normalize and cache
        countries = countries.map(c=>({ name: c.name, code: (c.code || '').toUpperCase() })).filter(c=>c.code);
        countries.sort((a,b)=>a.name.localeCompare(b.name));
        localStorage.setItem('countriesList', JSON.stringify(countries));

        // Populate select
        selectEl.innerHTML = '<option value="ALL">All countries</option>' + countries.map(c=>`<option value="${c.code}">${c.name}</option>`).join('');

        // Restore previously selected country
        const sel = localStorage.getItem('selectedCountry');
        if(sel){ selectEl.value = sel; }
      }catch(e){
        console.warn('Could not load countries list, leaving selector with default', e);
        // Ensure at least the default option exists
        selectEl.innerHTML = '<option value="ALL">All countries</option>';
      }
  }

function initMap(mapEl){
  if(!googleMapsLoaded) return;
  mapEl.classList.add('has-google-maps');
  const defaultPos = { lat: 37.7749, lng: -122.4194 };
  map = new google.maps.Map(mapEl, { 
    center: defaultPos, 
    zoom: 12,
    mapTypeControl: true,
    streetViewControl: true,
    fullscreenControl: true
  });
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({ 
    map,
    suppressMarkers: false,
    polylineOptions: {
      strokeColor: '#00d4ff',
      strokeWeight: 4
    }
  });

  // Get user location
  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(pos=>{
      const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      userLocation = p;
      map.setCenter(p);
      map.setZoom(15);
      userMarker = new google.maps.Marker({ 
        position: p, 
        map, 
        title: 'Your Location',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#00d4ff',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2
        }
      });
      debug('User location: ' + p.lat + ', ' + p.lng);
      
      // Update Leaflet map if it exists
      if(leafletMap){
        leafletMap.setView([p.lat, p.lng], 14);
        if(!userMarker || !userMarker._leaflet_id){
          L.marker([p.lat, p.lng], {
            icon: L.divIcon({
              className: 'custom-marker user-marker',
              html: '<div style="background:#00d4ff; width:16px; height:16px; border-radius:50%; border:3px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>',
              iconSize: [16, 16],
              iconAnchor: [8, 8]
            })
          }).addTo(leafletMap).bindPopup('Your Location');
        }
      }
      
      // Update transit with location
      fetchTransit();
    }, err => { 
      debug('geolocation denied or failed: ' + err.message);
      setStatus('Location access denied', '#ff9f43');
    });

    try{
      watchId = navigator.geolocation.watchPosition(p=>{
        const loc = { lat: p.coords.latitude, lng: p.coords.longitude };
        userLocation = loc;
        if(!userMarker){ 
          userMarker = new google.maps.Marker({ position: loc, map, title:'You' }); 
        } else { 
          userMarker.setPosition(loc); 
        }
        // Update navigation progress if navigating
        try{ updateNavigationProgress(); }catch(e){ debug('updateNavigationProgress error: '+e.message); }
      }, e=>{ debug('watchPosition failed'); }, { enableHighAccuracy:true, maximumAge:2000 });
    }catch(e){ debug('watchPosition unsupported'); }
  }

  // Initialize autocomplete for address inputs
  if(google.maps.places){
    const originInput = document.getElementById('origin');
    const destInput = document.getElementById('dest');
    
    if(originInput){
      originAutocomplete = new google.maps.places.Autocomplete(originInput, {
        types: ['geocode'],
        fields: ['formatted_address', 'geometry']
      });
      originAutocomplete.addListener('place_changed', () => {
        const place = originAutocomplete.getPlace();
        if(place.geometry){
          debug('Origin selected: ' + place.formatted_address);
        }
      });
    }
    
    if(destInput){
      destAutocomplete = new google.maps.places.Autocomplete(destInput, {
        types: ['geocode'],
        fields: ['formatted_address', 'geometry']
      });
      destAutocomplete.addListener('place_changed', () => {
        const place = destAutocomplete.getPlace();
        if(place.geometry){
          debug('Destination selected: ' + place.formatted_address);
        }
      });
    }
  }
}

// Auth functions
async function loginUser(email, password) {
  try {
    const res = await fetch(apiUrl('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }
    
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    setStatus(`Logged in as ${currentUser.name}`, '#00d4ff');
    return data;
  } catch (error) {
    debug('Login error: ' + error.message);
    throw error;
  }
}

async function registerUser(email, password, name) {
  try {
    const res = await fetch(apiUrl('/api/auth/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    });
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }
    
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    setStatus(`Welcome ${currentUser.name}!`, '#00d4ff');
    return data;
  } catch (error) {
    debug('Register error: ' + error.message);
    throw error;
  }
}

function logoutUser() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  setStatus('Logged out', 'var(--muted)');
}

async function saveRoute(route) {
  if (!authToken) {
    alert('Please login to save routes');
    showAuthModal();
    return;
  }
  
  try {
    const res = await fetch(apiUrl('/api/routes'), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        originAddress: route.origin || 'Unknown',
        originLat: route.origin_location?.lat || 0,
        originLng: route.origin_location?.lng || 0,
        destAddress: route.dest || 'Unknown',
        destLat: route.dest_location?.lat || 0,
        destLng: route.dest_location?.lng || 0,
        distanceKm: route.distance_km,
        durationMin: route.eta_min,
        routeData: route
      })
    });
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error || 'Failed to save route');
    }
    
    debug('Route saved: ' + data.id);
    alert('Route saved successfully!');
    return data;
  } catch (error) {
    debug('Save route error: ' + error.message);
    alert('Error saving route: ' + error.message);
  }
}

async function getSavedRoutes() {
  if (!authToken) return [];
  
  try {
    const res = await fetch(apiUrl('/api/routes/saved'), {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    return data.routes || [];
  } catch (error) {
    debug('Get saved routes error: ' + error.message);
    return [];
  }
}

async function deleteSavedRoute(routeId) {
  if (!authToken) return;
  
  try {
    const res = await fetch(apiUrl(`/api/routes/saved/${routeId}`), {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    
    if (!res.ok) {
      throw new Error('Failed to delete route');
    }
    
    debug('Route deleted: ' + routeId);
    return true;
  } catch (error) {
    debug('Delete route error: ' + error.message);
    return false;
  }
}

function showAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) modal.style.display = 'flex';
}

// Entry point: DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const mapEl = document.getElementById('map');
  const routesEl = document.getElementById('routes');
  const transitEl = document.getElementById('transit');
  const avgEtaEl = document.getElementById('avgEta');
  const hotspotsEl = document.getElementById('hotspots');
  const refreshBtn = document.getElementById('refreshBtn');
  const findRoutesBtn = document.getElementById('findRoutes');
  const originIn = document.getElementById('origin');
  const destIn = document.getElementById('dest');
  const countrySelect = document.getElementById('countrySelect');
  const optInLoggingEl = document.getElementById('optInLogging');
  const placeSearchIn = document.getElementById('placeSearch');
  const placeResultsEl = document.getElementById('placeResults');
  
  // Restore user session
  if (localStorage.getItem('currentUser')) {
    currentUser = JSON.parse(localStorage.getItem('currentUser'));
    setStatus(`Logged in as ${currentUser.name}`, '#00d4ff');
  }

  // helper to render the traffic areas (fallback when no Google Maps)
  function renderAreas(areas){
    // Only render areas if NO map is loaded (not Google Maps, not Leaflet)
    if(googleMapsLoaded && map){
      mapEl.classList.add('has-google-maps');
      return; // Don't render boxes when we have Google Maps
    }
    if(leafletMap){
      mapEl.classList.add('has-map');
      return; // Don't render boxes when we have Leaflet map
    }
    
    // Only render traffic area boxes if no map exists
    mapEl.classList.remove('has-google-maps');
    mapEl.classList.remove('has-map');
    mapEl.innerHTML = '';
    areas.forEach(a => {
      const div = document.createElement('div');
      div.className = 'area';
      const name = document.createElement('div'); name.className='name'; name.textContent = a.name;
      const cong = document.createElement('div'); cong.className='cong'; cong.textContent = `Congestion: ${a.congestion}%`;
      const bar = document.createElement('div'); bar.className='bar';
      const fill = document.createElement('div'); fill.className='fill'; fill.style.width = `${a.congestion}%`;
      bar.appendChild(fill);
      div.appendChild(name); div.appendChild(cong); div.appendChild(bar);
      mapEl.appendChild(div);
    });
  }

  // Populate countries selector and persist selection
  if(countrySelect){
    loadCountries(countrySelect).then(()=>{
      // Initialize a custom-styled dropdown and keep native select in sync
      try{ initCustomCountrySelect(countrySelect); }catch(e){ console.warn('custom country select init failed', e); }
      countrySelect.addEventListener('change', ()=>{
        localStorage.setItem('selectedCountry', countrySelect.value);
        // Update dashboard content based on new country selection
        try{ updateDashboardForCountry(countrySelect.value); }catch(e){ debug('updateDashboardForCountry error: '+e.message); }
      });
    });
  }

  // Place search input: debounce and show results
  if(placeSearchIn && placeResultsEl){
    let searchTimer = null;
    placeSearchIn.addEventListener('input', (e)=>{
      clearTimeout(searchTimer);
      const q = e.target.value;
      if(!q || q.trim().length < 2){ placeResultsEl.innerHTML = ''; return; }
      searchTimer = setTimeout(async ()=>{
        const results = await searchPlaces(q.trim());
        renderPlaceResults(results, placeResultsEl);
      }, 450);
    });
    placeSearchIn.addEventListener('keypress', (e)=>{ if(e.key === 'Enter'){ e.preventDefault(); placeSearchIn.dispatchEvent(new Event('input')); } });
  }

  // Trip logging: persist opt-in preference
  if(optInLoggingEl){
    // restore previous choice
    const saved = localStorage.getItem('navify_opt_in_logging');
    if(saved === '1') optInLoggingEl.checked = true;
    optInLoggingEl.addEventListener('change', () => {
      localStorage.setItem('navify_opt_in_logging', optInLoggingEl.checked ? '1' : '0');
    });
  }

  // Navigation trip lifecycle tracking
  let _tripStart = null; // { originLat, originLng, ts }

  // Initialize fallback map using Leaflet (OpenStreetMap)
  function initLeafletMap(mapEl){
    if(leafletMap) return; // Already initialized
    
    try {
      // Default center (will be updated with user location or route)
      const defaultCenter = [37.7749, -122.4194];
      
      leafletMap = L.map(mapEl).setView(defaultCenter, 13);
      
      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(leafletMap);
      
      mapEl.classList.add('has-map');
      debug('Leaflet map initialized');
      
      // Try to get user location for Leaflet map
      if(navigator.geolocation){
        navigator.geolocation.getCurrentPosition(pos => {
          const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          userLocation = p;
          leafletMap.setView([p.lat, p.lng], 14);
          
          L.marker([p.lat, p.lng], {
            icon: L.divIcon({
              className: 'custom-marker user-marker',
              html: '<div style="background:#00d4ff; width:16px; height:16px; border-radius:50%; border:3px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>',
              iconSize: [16, 16],
              iconAnchor: [8, 8]
            })
          }).addTo(leafletMap).bindPopup('Your Location');
        }, err => { debug('Leaflet geolocation failed: ' + err.message); });

        try{
          watchId = navigator.geolocation.watchPosition(p => {
            const loc = { lat: p.coords.latitude, lng: p.coords.longitude };
            userLocation = loc;
            // update or create user marker
            if(!userMarker || !userMarker._leaflet_id){
              userMarker = L.marker([loc.lat, loc.lng], {
                icon: L.divIcon({ className: 'custom-marker user-marker', html: '<div style="background:#00d4ff; width:16px; height:16px; border-radius:50%; border:3px solid white;"></div>' })
              }).addTo(leafletMap);
            } else {
              userMarker.setLatLng([loc.lat, loc.lng]);
            }
            try{ updateNavigationProgress(); }catch(e){ debug('updateNavigationProgress error: '+e.message); }
          }, e => { debug('watchPosition failed'); }, { enableHighAccuracy:true, maximumAge:2000 });
        }catch(e){ debug('watchPosition unsupported for Leaflet'); }
      }
    } catch(e) {
      debug('Failed to initialize Leaflet map: ' + e.message);
    }
  }

  // Display route on Leaflet map
  function displayRouteOnLeaflet(origin, destination, routeGeometry){
    if(!leafletMap) {
      debug('Leaflet map not initialized');
      return;
    }
    
    try {
      debug('Displaying route on Leaflet. Origin: ' + JSON.stringify(origin) + ', Dest: ' + JSON.stringify(destination));
      debug('Route geometry type: ' + (routeGeometry ? routeGeometry.type : 'null'));
      
      // Validate coordinates - if missing, provide fallback
      if((!origin || !origin.lat || !origin.lng) && (!destination || !destination.lat || !destination.lng)){
        debug('Missing both origin and destination coordinates, centering on San Francisco');
        leafletMap.setView([37.7749, -122.4194], 12);
      }
      
      // Clear previous markers and route
      if(originMarker && originMarker.remove) originMarker.remove();
      if(destMarker && destMarker.remove) destMarker.remove();
      if(routePolyline && routePolyline.remove) routePolyline.remove();
      
      // Add origin marker
      if(origin && origin.lat && origin.lng){
        originMarker = L.marker([origin.lat, origin.lng], {
          icon: L.divIcon({
            className: 'custom-marker origin-marker',
            html: '<div style="background:#00d4ff; width:20px; height:20px; border-radius:50%; border:3px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div><div style="color:white; font-weight:bold; margin-top:2px;">A</div>',
            iconSize: [20, 30],
            iconAnchor: [10, 30]
          })
        }).addTo(leafletMap).bindPopup('Origin');
        debug('Origin marker added at ' + origin.lat + ', ' + origin.lng);
      }
      
      // Add destination marker
      if(destination && destination.lat && destination.lng){
        destMarker = L.marker([destination.lat, destination.lng], {
          icon: L.divIcon({
            className: 'custom-marker dest-marker',
            html: '<div style="background:#ff6b6b; width:20px; height:20px; border-radius:50%; border:3px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div><div style="color:white; font-weight:bold; margin-top:2px;">B</div>',
            iconSize: [20, 30],
            iconAnchor: [10, 30]
          })
        }).addTo(leafletMap).bindPopup('Destination');
        debug('Destination marker added at ' + destination.lat + ', ' + destination.lng);
      }
      
      // Add route line
      currentRoutePolylinePoints = [];
      currentRouteSteps = [];
      if(routeGeometry){
        debug('Route geometry found. Type: ' + routeGeometry.type + ', Coordinates length: ' + (routeGeometry.coordinates ? routeGeometry.coordinates.length : 0));
        
        if(routeGeometry.coordinates && routeGeometry.coordinates.length > 0){
          // Handle different geometry types
          let latlngs = [];
          
          if(routeGeometry.type === 'LineString'){
            // Simple line string: coordinates are [lng, lat] pairs
            latlngs = routeGeometry.coordinates.map(coord => [coord[1], coord[0]]);
          } else if(routeGeometry.type === 'MultiLineString'){
            // Multi-line string: array of line strings
            latlngs = routeGeometry.coordinates.flat().map(coord => [coord[1], coord[0]]);
          } else {
            debug('Unknown geometry type: ' + routeGeometry.type);
            // Try to extract coordinates anyway
            latlngs = routeGeometry.coordinates.map(coord => {
              if(Array.isArray(coord) && coord.length >= 2){
                return [coord[1], coord[0]]; // Assume [lng, lat]
              }
              return null;
            }).filter(c => c !== null);
          }
          
          if(latlngs.length > 0){
            routePolyline = L.polyline(latlngs, {
              color: '#00d4ff',
              weight: 5,
              opacity: 0.9
            }).addTo(leafletMap);
            currentRoutePolylinePoints = latlngs.map(p=>({lat:p[0],lng:p[1]}));
            
            debug('Route polyline added with ' + latlngs.length + ' points');
            
            // Fit map to show entire route
            const bounds = routePolyline.getBounds();
            if(origin && origin.lat) bounds.extend([origin.lat, origin.lng]);
            if(destination && destination.lat) bounds.extend([destination.lat, destination.lng]);
            leafletMap.fitBounds(bounds, { padding: [30, 30] });
            debug('Map fitted to route bounds');
          } else {
            debug('Could not extract valid coordinates from geometry');
            // Fallback: create straight line
            if(origin && origin.lat && destination && destination.lat){
              routePolyline = L.polyline([[origin.lat, origin.lng], [destination.lat, destination.lng]], {
                color: '#00d4ff',
                weight: 5,
                opacity: 0.9,
                dashArray: '10, 10'
              }).addTo(leafletMap);
              leafletMap.fitBounds([[origin.lat, origin.lng], [destination.lat, destination.lng]], { padding: [30, 30] });
            }
          }
        } else {
          debug('Route geometry has no coordinates');
          // Still fit to markers if we have them
          if(origin && origin.lat && destination && destination.lat){
            // Create a simple straight line
            routePolyline = L.polyline([[origin.lat, origin.lng], [destination.lat, destination.lng]], {
              color: '#00d4ff',
              weight: 5,
              opacity: 0.9,
              dashArray: '10, 10'
            }).addTo(leafletMap);
            leafletMap.fitBounds([[origin.lat, origin.lng], [destination.lat, destination.lng]], { padding: [30, 30] });
          }
        }
      } else {
        debug('Route geometry is null or undefined');
        // Still fit to markers if we have them
        if(origin && origin.lat && destination && destination.lat){
          // Create a simple straight line as fallback
          routePolyline = L.polyline([[origin.lat, origin.lng], [destination.lat, destination.lng]], {
            color: '#00d4ff',
            weight: 5,
            opacity: 0.9,
            dashArray: '10, 10'
          }).addTo(leafletMap);
            leafletMap.fitBounds([[origin.lat, origin.lng], [destination.lat, destination.lng]], { padding: [30, 30] });
          debug('Fallback straight line route displayed');
        } else {
          debug('No valid coordinates available to display route. Showing default map view.');
          leafletMap.setView([37.7749, -122.4194], 12);
        }
      }
    } catch(e) {
      debug('Error displaying route on Leaflet: ' + e.message + '\n' + e.stack);
      console.error('Leaflet display error:', e);
    }
  }

  // Display route on Google Maps
  function displayRouteOnGoogleMap(origin, destination, routeData){
    if(!map || !window.google) {
      debug('Google Maps not available');
      return;
    }
    
    try {
      debug('Displaying route on Google Maps. Origin: ' + JSON.stringify(origin) + ', Dest: ' + JSON.stringify(destination));
      debug('Route data: ' + (routeData ? 'present' : 'missing'));
      
      // Clear previous markers
      if(originMarker) originMarker.setMap(null);
      if(destMarker) destMarker.setMap(null);
      if(routePolyline) routePolyline.setMap(null);
      
      // Add origin marker
      if(origin && origin.lat && origin.lng){
        originMarker = new google.maps.Marker({
          position: { lat: origin.lat, lng: origin.lng },
          map: map,
          title: 'Origin',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#00d4ff',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 3
          },
          label: {
            text: 'A',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 'bold'
          }
        });
      }
      
      // Add destination marker
      if(destination && destination.lat && destination.lng){
        destMarker = new google.maps.Marker({
          position: { lat: destination.lat, lng: destination.lng },
          map: map,
          title: 'Destination',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#ff6b6b',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 3
          },
          label: {
            text: 'B',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 'bold'
          }
        });
      }
      
      // Display route
      if(routeData){
        if(routeData.geometry && routeData.geometry.coordinates){
          // Geoapify route
          const path = routeData.geometry.coordinates.map(coord => ({
            lat: coord[1],
            lng: coord[0]
          }));
          
          routePolyline = new google.maps.Polyline({
            path: path,
            geodesic: true,
            strokeColor: '#00d4ff',
            strokeOpacity: 1.0,
            strokeWeight: 5
          });
          routePolyline.setMap(map);
          currentRoutePolylinePoints = path.map(p=>({ lat: p.lat, lng: p.lng }));
          
          // Fit bounds
          const bounds = new google.maps.LatLngBounds();
          path.forEach(point => bounds.extend(point));
          if(origin && origin.lat) bounds.extend({ lat: origin.lat, lng: origin.lng });
          if(destination && destination.lat) bounds.extend({ lat: destination.lat, lng: destination.lng });
          map.fitBounds(bounds, 40);
        } else if(routeData.polyline){
          // Google Maps polyline
          function decodePolyline(encoded) {
            const poly = [];
            let index = 0, lat = 0, lng = 0;
            while (index < encoded.length) {
              let b, shift = 0, result = 0;
              do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
              } while (b >= 0x20);
              const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
              lat += dlat;
              shift = 0;
              result = 0;
              do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
              } while (b >= 0x20);
              const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
              lng += dlng;
              poly.push({ lat: lat * 1e-5, lng: lng * 1e-5 });
            }
            return poly;
          }
          
          const decodedPath = decodePolyline(routeData.polyline);
          routePolyline = new google.maps.Polyline({
            path: decodedPath,
            geodesic: true,
            strokeColor: '#00d4ff',
            strokeOpacity: 1.0,
            strokeWeight: 5
          });
          routePolyline.setMap(map);
          currentRoutePolylinePoints = decodedPath.map(p=>({ lat: p.lat, lng: p.lng }));
          
          const bounds = new google.maps.LatLngBounds();
          decodedPath.forEach(point => bounds.extend(point));
          map.fitBounds(bounds, 40);
        }
      }
    } catch(e) {
      debug('Error displaying route on Google Maps: ' + e.message);
    }
  }

  // load server config (maps API key) and initialize map if present
  async function loadConfig(){
    try{
      const res = await fetch(apiUrl('/api/config'));
      const cfg = await res.json();
      debug('loadConfig response: ' + JSON.stringify(cfg));
      if(cfg && cfg.mapsApiKey){
        debug('Google Maps API key found, loading Google Maps...');
        try {
          await loadGoogleMaps(cfg.mapsApiKey);
          initMap(mapEl);
          debug('Google Maps loaded and initialized');
        } catch(mapsError) {
          debug('Google Maps failed to load: ' + mapsError.message + ', falling back to Leaflet');
          initLeafletMap(mapEl);
        }
      } else {
        debug('No Google Maps key provided; using Leaflet fallback');
        initLeafletMap(mapEl);
      }
    }catch(e){ 
      debug('loadConfig failed: '+(e && e.message));
      // Initialize fallback map anyway
      initLeafletMap(mapEl);
    }
  }

  // fetch data functions
  async function fetchTraffic(){
    debug('fetchTraffic start');
    let data;
    try{
      const res = await fetch(apiUrl('/api/traffic'));
      data = await res.json();
      setStatus('connected', 'var(--accent-2)');
      debug('fetchTraffic: got ' + (data.areas && data.areas.length));
    }catch(e){
      console.warn('fetchTraffic failed, using fallback', e);
      setStatus('using fallback', '#ff9f43');
      data = { areas: [ {id:'A1',name:'Main Ave - East',congestion:30}, {id:'A2',name:'Central Blvd',congestion:45}, {id:'A3',name:'Market St',congestion:70}, {id:'A4',name:'University Road',congestion:20} ] };
    }
    renderAreas(data.areas);
    updateAnalytics(data.areas);
  }

  function updateAnalytics(areas){
    // Dashboard analytics removed: keep this function as a noop so older calls don't break.
    return;
  }

  // --- Dashboard slideshow and country-aware place slides ---
  const dashboardEl = document.getElementById('dashboardContent');
  let slideshowState = { slides: [], idx: 0, timer: null };

  function createPromoSlides(){
    return [
      { img: 'https://source.unsplash.com/800x450/?map,city', title: 'Smart routing', text: 'Find the best routes with live traffic and turn-by-turn guidance.' },
      { img: 'https://source.unsplash.com/800x450/?commute,traffic', title: 'Real-time traffic', text: 'GPS-powered congestion insights help you avoid delays.' },
      { img: 'https://source.unsplash.com/800x450/?hospital,pharmacy', title: 'Find places', text: 'Search for supermarkets, hospitals, universities and more — globally.' },
      { img: 'https://source.unsplash.com/800x450/?public,transport', title: 'Transit info', text: 'Quickly see next departures and nearby stops where available.' }
    ];
  }

  function buildSlidesHtml(slides){
    const wrap = document.createElement('div'); wrap.className = 'slideshow';
    slides.forEach((s, i)=>{
      const slide = document.createElement('div'); slide.className = 'slide' + (i===0 ? ' active' : '');
      // Add a subtle background to the slide as a fallback while image loads
      slide.style.background = 'linear-gradient(180deg, rgba(7,16,33,0.6), rgba(5,32,51,0.6))';
      const img = document.createElement('img'); img.alt = s.title || 'Slide';

      // Preload the image and set src only if it loads; otherwise use placeholder
      try{
        const preload = new Image();
        preload.crossOrigin = 'anonymous';
        // Cache buster to help with fresh fetches during development
        const cb = Date.now();
        const src = (s.img || '').includes('?') ? `${s.img}&cb=${cb}` : `${s.img}?cb=${cb}`;
        preload.onload = () => { img.src = src; };
        preload.onerror = () => { img.src = generatePlaceholderDataUrl(s.title || '', s.text || ''); };
        preload.src = src;
      }catch(e){ img.src = generatePlaceholderDataUrl(s.title || '', s.text || ''); }

      const cap = document.createElement('div'); cap.className = 'slide-caption';
      cap.innerHTML = `<h4>${s.title || ''}</h4><p>${s.text || ''}</p>`;
      slide.appendChild(img); slide.appendChild(cap);
      wrap.appendChild(slide);
    });
    // controls
    const controls = document.createElement('div'); controls.className = 'slide-controls';
    const prev = document.createElement('button'); prev.textContent = '◀';
    const next = document.createElement('button'); next.textContent = '▶';
    prev.addEventListener('click', ()=>{ showSlide(slideshowState.idx - 1); });
    next.addEventListener('click', ()=>{ showSlide(slideshowState.idx + 1); });
    controls.appendChild(prev); controls.appendChild(next);
    const container = document.createElement('div'); container.appendChild(wrap); container.appendChild(controls);
    return { container, wrap };
  }

  // Generate a simple SVG placeholder encoded as a data URL
  function generatePlaceholderDataUrl(title, subtitle){
    const w = 1200, h = 675;
    const bg = '#0b1320';
    const accent = '#00d4ff';
    const svg = `
      <svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>
        <defs>
          <linearGradient id='g' x1='0' x2='1'>
            <stop offset='0' stop-color='#071021'/>
            <stop offset='1' stop-color='#052033'/>
          </linearGradient>
        </defs>
        <rect width='100%' height='100%' fill='url(#g)' />
        <rect x='40' y='${h-220}' width='${w-80}' height='160' rx='12' fill='rgba(0,0,0,0.32)' />
        <text x='80' y='${h-140}' font-family='Arial, Helvetica, sans-serif' font-size='36' fill='${accent}'>${escapeXml(title)}</text>
        <text x='80' y='${h-100}' font-family='Arial, Helvetica, sans-serif' font-size='18' fill='rgba(255,255,255,0.9)'>${escapeXml(subtitle)}</text>
      </svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function escapeXml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

  function showSlide(i){
    if(!slideshowState.slides || slideshowState.slides.length===0) return;
    const len = slideshowState.slides.length;
    let idx = ((i % len) + len) % len;
    slideshowState.idx = idx;
    const nodes = slideshowState.wrap.querySelectorAll('.slide');
    nodes.forEach((n, k)=> n.classList.toggle('active', k===idx));
  }

  function startSlideshow(slides, interval = 4000){
    stopSlideshow();
    slideshowState.slides = slides;
    const html = buildSlidesHtml(slides);
    // clear dashboard and place slideshow
    if(!dashboardEl) return;
    dashboardEl.innerHTML = '';
    dashboardEl.appendChild(html.container);
    slideshowState.wrap = html.wrap;
    showSlide(0);
    slideshowState.timer = setInterval(()=> showSlide(slideshowState.idx + 1), interval);
  }

  function stopSlideshow(){
    if(slideshowState.timer){ clearInterval(slideshowState.timer); slideshowState.timer = null; }
  }

  async function updateDashboardForCountry(code){
    // If no country or ALL, show promo content
    if(!code || code === 'ALL'){
      const slides = createPromoSlides();
      startSlideshow(slides, 4500);
      return;
    }

    // For a selected country, fetch some sample places for common categories
    const types = ['supermarket','hospital','pharmacy','university','police station'];
    const slides = [];
    for(const t of types){
      try{
        // First try Google Places if server supports it
        let used = false;
        try{
          const gRes = await fetch(apiUrl(`/api/google/places?query=${encodeURIComponent(t + ' in ' + code)}&country=${encodeURIComponent(code)}`));
          if(gRes.ok){
            const gData = await gRes.json();
            const gp = (gData.results && gData.results.length>0) ? gData.results[0] : null;
            if(gp){
              const title = gp.name || t;
              const text = gp.formatted_address || t;
              if(gp.photos && gp.photos.length>0 && gp.photos[0].photo_reference){
                const ref = gp.photos[0].photo_reference;
                const img = apiUrl(`/api/google/photo?ref=${encodeURIComponent(ref)}&maxwidth=900`);
                slides.push({ img, title, text });
                used = true;
              } else {
                // No photos in Google result; still add a slide with Unsplash fallback
                const q = encodeURIComponent(gp.name || t);
                const img = `https://source.unsplash.com/800x450/?${q}`;
                slides.push({ img, title, text });
                used = true;
              }
            }
          }
        }catch(ge){ debug('google places fetch failed: '+ge.message); }

        if(!used){
          // Fallback to existing searchPlaces (Geoapify/Nominatim) and Unsplash
          const results = await searchPlaces(t);
          const p = (results && results.length>0) ? results[0] : null;
          const title = p ? (p.name || t) : t;
          const q = encodeURIComponent(p ? (p.name || t) : `${t} ${code}`);
          const img = `https://source.unsplash.com/800x450/?${q}`;
          const text = p ? (p.address || p.label || (p.category || t)) : `Explore ${t} in ${code}`;
          slides.push({ img, title, text });
        }
      }catch(e){ debug('updateDashboardForCountry error: '+e.message); }
    }
    if(slides.length === 0){ startSlideshow(createPromoSlides()); } else { startSlideshow(slides); }
  }

  // --- Places search and basic navigation helpers ---
  let _placesCache = {};
  let navActive = false;
  let navPingIntervalId = null;
  let navControlEl = null;

  async function searchPlaces(query){
    if(!query || query.trim().length === 0) return [];
    const selectedCountry = (countrySelect && countrySelect.value) || localStorage.getItem('selectedCountry') || 'ALL';
    const countryQuery = (selectedCountry && selectedCountry !== 'ALL') ? `&country=${encodeURIComponent(selectedCountry)}` : '';
    try{
      const res = await fetch(apiUrl(`/api/places?q=${encodeURIComponent(query)}${countryQuery}&limit=10`));
      const data = await res.json();
      if(data && data.places){
        data.places.forEach(p => { if(p && p.id) _placesCache[p.id] = p; });
        return data.places;
      }
      return [];
    }catch(e){ debug('searchPlaces failed: ' + e.message); return []; }
  }

  function renderPlaceResults(results, resultsEl){
    resultsEl.innerHTML = '';
    if(!results || results.length === 0){ resultsEl.innerHTML = '<div class="muted">No places found</div>'; return; }
    results.forEach(p => {
      const div = document.createElement('div'); div.className = 'place-result';
      div.innerHTML = `<div class="place-name">${p.name}</div><div class="muted place-type">${p.category || ''}</div>`;
      const actions = document.createElement('div'); actions.className = 'place-actions';
      const navBtn = document.createElement('button'); navBtn.className = 'btn small'; navBtn.textContent = 'Navigate';
      navBtn.addEventListener('click', ()=>{
        // fill destination and start search+navigation
        if(p.address) destIn.value = p.address;
        // Kick off route search using coordinates if available
        if(p.lat && p.lng){
          // set dest to coordinates to avoid ambiguous geocoding
          const coordStr = `${p.lat},${p.lng}`;
          destIn.value = p.name || p.address || coordStr;
          findRoutes('', coordStr);
          // Start navigation once route is computed (currentRoute will be set by findRoutes)
          setTimeout(()=>{
            try{ startNavigation(currentRoute, userLocation || null, { lat: p.lat, lng: p.lng }); }catch(e){ debug('startNavigation error: '+e.message); }
          }, 800);
        } else {
          // fallback: search routes by address text
          findRoutes('', p.address || p.name);
        }
      });
      actions.appendChild(navBtn);
      div.appendChild(actions);
      resultsEl.appendChild(div);
    });
  }

  function startNavigation(route, originCoords, destCoords){
    if(!route){ alert('No route loaded to navigate'); return; }
    if(navActive) stopNavigation();
    navActive = true;

    // Create small floating control to stop navigation
    navControlEl = document.createElement('div');
    navControlEl.className = 'nav-control';
    navControlEl.innerHTML = `<div class="nav-status">Navigating • <span class="muted">Press stop to end</span></div>`;
    const stopBtn = document.createElement('button'); stopBtn.className = 'btn'; stopBtn.textContent = 'Stop';
    stopBtn.addEventListener('click', stopNavigation);
    navControlEl.appendChild(stopBtn);
    document.body.appendChild(navControlEl);

    // Start pinging server every 8 seconds with current location
    async function sendPing(lat, lng, speed){
      try{
        await fetch(apiUrl('/api/traffic/ping'), {
          method:'POST', headers: { 'Content-Type':'application/json' },
          body: JSON.stringify({ lat, lng, speed: speed || 0, ts: Date.now() })
        });
      }catch(e){ debug('ping failed: ' + e.message); }
    }

    // Record trip start if logging is enabled
    const shouldLog = optInLoggingEl && optInLoggingEl.checked;
    if(shouldLog){
      _tripStart = {
        originLat: originCoords && originCoords.lat ? originCoords.lat : (userLocation && userLocation.lat ? userLocation.lat : null),
        originLng: originCoords && originCoords.lng ? originCoords.lng : (userLocation && userLocation.lng ? userLocation.lng : null),
        ts: Date.now()
      };
    }

    // Immediate ping and set interval
    if(userLocation && userLocation.lat){ sendPing(userLocation.lat, userLocation.lng, 0); }
    navPingIntervalId = setInterval(()=>{
      const loc = userLocation;
      if(loc && loc.lat){ sendPing(loc.lat, loc.lng, 0); }
    }, 8000);

    setStatus('Navigation active', '#4ecdc4');
    // Center map to user location and route
    if(leafletMap && route && route.geometry){ displayRouteOnLeaflet(originCoords, destCoords, route.geometry); }
    if(map && googleMapsLoaded && route){ displayRouteOnGoogleMap(originCoords, destCoords, route); }

    // Build steps list for turn-by-turn (try multiple formats)
    try{
      currentRouteSteps = [];
      // Google route: route has 'legs' with steps
      if(route && route.legs && route.legs.length > 0){
        route.legs.forEach(leg => {
          (leg.steps || []).forEach(s => {
            currentRouteSteps.push({
              instruction: (s.instructions || s.html_instructions || s.maneuver) ? (s.instructions || s.html_instructions || s.maneuver) : (s.name || ''),
              lat: s.end_location ? s.end_location.lat : (s.geometry && s.geometry.coordinates ? s.geometry.coordinates[1] : null),
              lng: s.end_location ? s.end_location.lng : (s.geometry && s.geometry.coordinates ? s.geometry.coordinates[0] : null),
              distance: s.distance ? (s.distance.value || s.distance) : null
            });
          });
        });
      }
      // Server route: steps may be in route.steps with instruction and lat/lng in geometry
      else if(route && route.steps && route.steps.length > 0){
        route.steps.forEach(s => {
          currentRouteSteps.push({
            instruction: s.instruction || s.name || '',
            lat: s.lat || (s.location && s.location.lat) || (s.geometry && s.geometry.coordinates ? s.geometry.coordinates[1] : null),
            lng: s.lng || (s.location && s.location.lng) || (s.geometry && s.geometry.coordinates ? s.geometry.coordinates[0] : null),
            distance: s.distance || null
          });
        });
      }
      // Render instructions panel
      renderInstructions();
    }catch(e){ debug('build steps error: '+e.message); }
  }

  function renderInstructions(){
    if(!instructionsEl) instructionsEl = document.getElementById('instructionsList');
    if(!instructionsEl) return;
    if(!currentRouteSteps || currentRouteSteps.length === 0){ instructionsEl.innerHTML = '<div class="muted">No turn-by-turn steps available</div>'; return; }
    instructionsEl.innerHTML = '';
    currentRouteSteps.forEach((s, idx) => {
      const div = document.createElement('div'); div.className = 'instruction-item';
      div.dataset.idx = idx;
      div.innerHTML = `<div><strong>${idx+1}.</strong> <span class="instr-text">${s.instruction || 'Proceed'}</span></div><div class="muted">${s.distance ? s.distance + 'm' : ''}</div>`;
      instructionsEl.appendChild(div);
    });
  }

  function haversine(a,b){
    if(!a || !b) return Infinity;
    const toRad = x => x * Math.PI/180;
    const R = 6371000;
    const dLat = toRad(b.lat - a.lat); const dLon = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat); const lat2 = toRad(b.lat);
    const A = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.sin(dLon/2)*Math.sin(dLon/2)*Math.cos(lat1)*Math.cos(lat2);
    const C = 2 * Math.atan2(Math.sqrt(A), Math.sqrt(1-A));
    return R * C;
  }

  // Find nearest instruction step and highlight upcoming maneuvers; snap user marker to route polyline
  function updateNavigationProgress(){
    if(!navActive) return;
    if(!userLocation) return;
    // Snap user to nearest point on polyline (approx nearest vertex)
    if(currentRoutePolylinePoints && currentRoutePolylinePoints.length > 0){
      let minD = Infinity; let minIdx = -1;
      currentRoutePolylinePoints.forEach((pt, i)=>{ const d = haversine(userLocation, pt); if(d < minD){ minD = d; minIdx = i; } });
      if(minIdx >= 0){
        // Move user marker to snapped point for visual guidance
        const snap = currentRoutePolylinePoints[minIdx];
        if(leafletMap && userMarker && userMarker.setLatLng){ userMarker.setLatLng([snap.lat, snap.lng]); }
        if(map && googleMapsLoaded && userMarker && userMarker.setPosition){ userMarker.setPosition({ lat: snap.lat, lng: snap.lng }); }
      }
    }

    // Highlight upcoming instruction step
    if(currentRouteSteps && currentRouteSteps.length > 0){
      let nearestIdx = -1; let nearestD = Infinity;
      currentRouteSteps.forEach((s, idx)=>{ if(s.lat && s.lng){ const d = haversine(userLocation, {lat:s.lat,lng:s.lng}); if(d < nearestD){ nearestD = d; nearestIdx = idx; } } });
      // If within 200m pick that as upcoming, else find next step ahead
      const upcoming = nearestIdx >= 0 && nearestD < 200 ? nearestIdx : Math.max(0, nearestIdx);
      // update DOM
      const items = instructionsEl ? Array.from(instructionsEl.querySelectorAll('.instruction-item')) : [];
      items.forEach(it=> it.classList.remove('upcoming'));
      if(items[upcoming]) items[upcoming].classList.add('upcoming');
      // Optionally, scroll into view
      if(items[upcoming]) items[upcoming].scrollIntoView({ block:'nearest', behavior:'smooth' });
    }
  }

  function stopNavigation(){
    navActive = false;
    if(navPingIntervalId){ clearInterval(navPingIntervalId); navPingIntervalId = null; }
    if(navControlEl && navControlEl.remove) navControlEl.remove(); navControlEl = null;
    setStatus('Navigation stopped', 'var(--muted)');
    // If opt-in logging was enabled, create a trip log
    try{
      const shouldLog = optInLoggingEl && optInLoggingEl.checked;
      if(shouldLog && _tripStart){
        const endTs = Date.now();
        const durationSec = Math.round((endTs - _tripStart.ts)/1000);
        // Distance: try to use route distance if available
        let distanceKm = null;
        if(currentRoute && (currentRoute.distance_km || currentRoute.distance_km === 0)) distanceKm = currentRoute.distance_km;
        else if(currentRoute && currentRoute.geometry && currentRoute.geometry.coordinates){
          // approximate length by summing haversine segments
          const coords = currentRoute.geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }));
          let meters = 0;
          for(let i=1;i<coords.length;i++){
            const a = coords[i-1]; const b = coords[i];
            const R = 6371000; // m
            const toRad = x => x * Math.PI/180;
            const dLat = toRad(b.lat - a.lat); const dLon = toRad(b.lng - a.lng);
            const lat1 = toRad(a.lat); const lat2 = toRad(b.lat);
            const A = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.sin(dLon/2)*Math.sin(dLon/2)*Math.cos(lat1)*Math.cos(lat2);
            const C = 2 * Math.atan2(Math.sqrt(A), Math.sqrt(1-A));
            meters += R * C;
          }
          distanceKm = +(meters/1000).toFixed(2);
        }

        const tripPayload = {
          originLat: _tripStart.originLat,
          originLng: _tripStart.originLng,
          destLat: userLocation && userLocation.lat ? userLocation.lat : (currentRoute && currentRoute.dest_location && currentRoute.dest_location.lat ? currentRoute.dest_location.lat : null),
          destLng: userLocation && userLocation.lng ? userLocation.lng : (currentRoute && currentRoute.dest_location && currentRoute.dest_location.lng ? currentRoute.dest_location.lng : null),
          startTs: _tripStart.ts,
          endTs,
          durationSec,
          distanceKm,
          anonymized: 1,
          meta: { via: 'client', routeName: currentRoute && currentRoute.name }
        };

        // Send trip to server (use auth when available)
        (async ()=>{
          try{
            const headers = authToken ? { 'Content-Type':'application/json', 'Authorization': `Bearer ${authToken}` } : { 'Content-Type':'application/json' };
            await fetch(apiUrl('/api/trips'), { method:'POST', headers, body: JSON.stringify(tripPayload) });
            debug('Trip logged');
          }catch(e){ debug('Trip log failed: ' + e.message); }
        })();
      }
    }catch(e){ debug('stopNavigation logging error: '+e.message); }
    _tripStart = null;
  }


  async function fetchTransit(){
    debug('fetchTransit start');
    let data;
    try{
      let url = apiUrl('/api/transit');
      if(userLocation){
        url += `?lat=${userLocation.lat}&lng=${userLocation.lng}`;
      }
      const res = await fetch(url);
      data = await res.json();
      debug('fetchTransit: got ' + (data.next && data.next.length));
    }catch(e){
      console.warn('fetchTransit failed, using fallback', e);
      data = { next: [ { line: 'Bus 12', in_min: 5, status: 'On time' }, { line: 'Bus 3', in_min: 12, status: 'Delayed 4m' } ] };
    }
    transitEl.innerHTML = '';
    if(data.next && data.next.length > 0){
      data.next.forEach(n=>{
        const item = document.createElement('div');
        item.className = 'transit-item';
        item.innerHTML = `<div>${n.line} <span class='muted'>in ${n.in_min}m</span></div><div>${n.status}</div>`;
        transitEl.appendChild(item);
      });
    } else {
      transitEl.innerHTML = '<div class="muted">No transit information available</div>';
    }
  }

  // Show loading state
  function showLoading(element, message = 'Searching routes...'){
    element.innerHTML = `<div class="loading-state"><div class="spinner"></div><div class="muted">${message}</div></div>`;
  }

  // find routes: use Google Directions if available, otherwise fall back to server API
  async function findRoutes(origin='', dest=''){
    debug('findRoutes start');
    
    // Show loading state
    showLoading(routesEl, 'Finding best routes...');
    findRoutesBtn.disabled = true;
    findRoutesBtn.textContent = 'Searching...';

    // Get origin - prefer user location if available
    let originVal = origin || originIn.value || '';
    if(!originVal && userLocation){
      originVal = `${userLocation.lat},${userLocation.lng}`;
      originIn.placeholder = 'Using your location';
    }
    
    const destVal = dest || destIn.value || '';
    
    if(!destVal){
      routesEl.innerHTML = '<div class="error-state muted">Please enter a destination</div>';
      findRoutesBtn.disabled = false;
      findRoutesBtn.textContent = 'Find Routes';
      return;
    }

    // If Google Maps Directions is available, use it
    if(directionsService && map && googleMapsLoaded){
      const request = { 
        origin: originVal, 
        destination: destVal, 
        travelMode: google.maps.TravelMode.DRIVING, 
        provideRouteAlternatives: true 
      };
      
      directionsService.route(request, (result, status) => {
        findRoutesBtn.disabled = false;
        findRoutesBtn.textContent = 'Find Routes';
        
        if(status === 'OK'){
          directionsRenderer.setDirections(result);
          routesEl.innerHTML = '';
          let totalEta = 0;
          
          // Extract origin and destination from first route
          const firstRoute = result.routes[0];
          const firstLeg = firstRoute.legs[0];
          const originCoords = {
            lat: firstLeg.start_location.lat(),
            lng: firstLeg.start_location.lng()
          };
          const destCoords = {
            lat: firstLeg.end_location.lat(),
            lng: firstLeg.end_location.lng()
          };
          
          // Display markers
          if(originMarker) originMarker.setMap(null);
          if(destMarker) destMarker.setMap(null);
          
          originMarker = new google.maps.Marker({
            position: originCoords,
            map: map,
            title: 'Origin',
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#00d4ff',
              fillOpacity: 1,
              strokeColor: '#fff',
              strokeWeight: 3
            },
            label: {
              text: 'A',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 'bold'
            }
          });
          
          destMarker = new google.maps.Marker({
            position: destCoords,
            map: map,
            title: 'Destination',
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#ff6b6b',
              fillOpacity: 1,
              strokeColor: '#fff',
              strokeWeight: 3
            },
            label: {
              text: 'B',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 'bold'
            }
          });
          
          result.routes.forEach((r, idx) => {
            const legs = r.legs || [];
            const eta = legs.reduce((s,l)=>s + (l.duration? l.duration.value/60:0),0);
            const distance = legs.reduce((s,l)=>s + (l.distance? l.distance.value/1000:0),0);
            totalEta += eta;
            
            const div = document.createElement('div');
            div.className = 'route-item';
            div.innerHTML = `
              <div>
                <strong>${idx === 0 ? '⭐ Fastest Route' : `Route Option ${idx + 1}`}</strong>
                <div class='muted'>${r.summary || 'Route'} • ${distance.toFixed(1)} km • ${Math.round(eta)} min</div>
              </div>
              <div>
                <button class='btn small show-map' data-idx='${idx}'>Show on Map</button>
              </div>
            `;
            routesEl.appendChild(div);
            
            const btn = div.querySelector('.show-map');
            btn.addEventListener('click', ()=>{
              directionsRenderer.setDirections({ routes: [r] });
              try{ map.fitBounds(r.bounds, 40); }catch(e){ map.fitBounds(r.bounds); }
              // Highlight selected route
              document.querySelectorAll('.route-item').forEach(item => item.classList.remove('selected'));
              div.classList.add('selected');
            });
            
            // Add start navigation button
            const startBtn = document.createElement('button');
            startBtn.className = 'btn small';
            startBtn.style.cssText = 'margin-top:6px; display:block; width:100%; background:#2ecc71;';
            startBtn.textContent = 'Start';
            startBtn.addEventListener('click', ()=>{
              // Use first leg locations as origin/dest
              try{
                startNavigation(r, originCoords, destCoords);
              }catch(e){ debug('start navigation error: '+e.message); }
            });
            div.querySelector('div:last-child').appendChild(startBtn);
          });
          
          avgEtaEl.textContent = Math.round(totalEta / Math.max(1, result.routes.length));
          debug('Found ' + result.routes.length + ' routes');
        } else {
          debug('DirectionsService failed: ' + status);
          routesEl.innerHTML = `<div class="error-state muted">Could not find routes: ${status}</div>`;
        }
      });
      return;
    }

    // Fallback to server API
    debug('findRoutes using server API');
    try{
      // include optional country filter when provided
      const selectedCountry = (countrySelect && countrySelect.value) || localStorage.getItem('selectedCountry') || 'ALL';
      const countryQuery = (selectedCountry && selectedCountry !== 'ALL') ? `&country=${encodeURIComponent(selectedCountry)}` : '';
      const res = await fetch(apiUrl(`/api/routes?origin=${encodeURIComponent(originVal)}&dest=${encodeURIComponent(destVal)}${countryQuery}`));
      const data = await res.json();
      debug('findRoutes: got ' + (data.routes && data.routes.length));
      
      findRoutesBtn.disabled = false;
      findRoutesBtn.textContent = 'Find Routes';
      
      if(data.error){
        routesEl.innerHTML = `<div class="error-state muted">${data.error}</div>`;
        return;
      }
      
      routesEl.innerHTML = '';
      let sumEta = 0;
      
      // Get origin and destination coordinates for map display
      let originCoords = null;
      let destCoords = null;
      
      // Try to geocode if we have addresses
      if(originVal && !/^-?\d+\.?\d*,-?\d+\.?\d*$/.test(originVal)){
        try {
          const selectedCountry = (countrySelect && countrySelect.value) || localStorage.getItem('selectedCountry') || 'ALL';
          const countryQuery = (selectedCountry && selectedCountry !== 'ALL') ? `&country=${encodeURIComponent(selectedCountry)}` : '';
          const geoRes = await fetch(apiUrl(`/api/geocode?address=${encodeURIComponent(originVal)}${countryQuery}`));
          const geoData = await geoRes.json();
          if(geoData.location) originCoords = geoData.location;
        } catch(e) {
          debug('Could not geocode origin: ' + e.message);
        }
      } else if(originVal && /^-?\d+\.?\d*,-?\d+\.?\d*$/.test(originVal)){
        const parts = originVal.split(',');
        originCoords = { lat: parseFloat(parts[0]), lng: parseFloat(parts[1]) };
      } else if(userLocation){
        originCoords = userLocation;
      }
      
      if(destVal && !/^-?\d+\.?\d*,-?\d+\.?\d*$/.test(destVal)){
        try {
          const selectedCountry = (countrySelect && countrySelect.value) || localStorage.getItem('selectedCountry') || 'ALL';
          const countryQuery = (selectedCountry && selectedCountry !== 'ALL') ? `&country=${encodeURIComponent(selectedCountry)}` : '';
          const geoRes = await fetch(apiUrl(`/api/geocode?address=${encodeURIComponent(destVal)}${countryQuery}`));
          const geoData = await geoRes.json();
          if(geoData.location) destCoords = geoData.location;
        } catch(e) {
          debug('Could not geocode destination: ' + e.message);
        }
      } else if(destVal && /^-?\d+\.?\d*,-?\d+\.?\d*$/.test(destVal)){
        const parts = destVal.split(',');
        destCoords = { lat: parseFloat(parts[0]), lng: parseFloat(parts[1]) };
      }
      
      if(data.routes && data.routes.length > 0){
        // Use origin/dest from API response if available, otherwise use geocoded values
        const finalOriginCoords = data.origin_location || originCoords;
        const finalDestCoords = data.dest_location || destCoords;
        
        // Display first route on map immediately
        const firstRoute = data.routes[0];
        currentRoute = firstRoute;
        
        debug('Displaying route on map. Origin: ' + JSON.stringify(finalOriginCoords) + ', Dest: ' + JSON.stringify(finalDestCoords));
        debug('Route geometry: ' + (firstRoute.geometry ? 'present' : 'missing'));
        
        // Ensure map is initialized
        if(!map && !leafletMap){
          debug('Map not initialized, initializing Leaflet...');
          initLeafletMap(mapEl);
        }
        
        // Wait a bit for map to initialize, then display route
        setTimeout(() => {
          if(map && googleMapsLoaded){
            debug('Displaying on Google Maps');
            displayRouteOnGoogleMap(finalOriginCoords, finalDestCoords, firstRoute);
          } else if(leafletMap){
            debug('Displaying on Leaflet map');
            displayRouteOnLeaflet(finalOriginCoords, finalDestCoords, firstRoute.geometry);
          } else {
            debug('No map available to display route');
          }
          
          // Scroll to map to show the route
          const mapPanel = document.querySelector('.map-panel');
          if(mapPanel){
            mapPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 300);
        
        data.routes.forEach((r, idx) => {
          const div = document.createElement('div');
          div.className = 'route-item';
          
          // Build route details
          let details = `${r.distance_text || r.distance_km + ' km'} • ${r.duration_text || r.eta_min + ' min'}`;
          if(r.summary) details = r.summary + ' • ' + details;
          
          const stepsHtml = r.steps && r.steps.length > 0 ? `
            <div class="route-steps" style="display:none; margin-top:8px; font-size:12px;">
              ${r.steps.slice(0, 3).map(s => `<div class="muted">→ ${s.instruction}</div>`).join('')}
              ${r.steps.length > 3 ? `<div class="muted">... and ${r.steps.length - 3} more steps</div>` : ''}
            </div>
          ` : '';
          
          div.innerHTML = `
            <div>
              <strong>${r.name || `Route ${idx + 1}`}</strong>
              <div class='muted'>${details}</div>
              ${stepsHtml}
            </div>
            <div style="display:flex; flex-direction:column; gap:4px;">
              <strong>${r.eta_min} min</strong>
              ${r.steps ? `<button class='btn small details-btn' style="display:block; width:100%;">Details</button>` : ''}
              <button class='btn small save-route-btn' style="display:block; width:100%; background:#4ecdc4;">Save</button>
            </div>
          `;
          
          // Add event listener for details button
          if(r.steps){
            const detailsBtn = div.querySelector('.details-btn');
            const stepsEl = div.querySelector('.route-steps');
            if(detailsBtn && stepsEl){
              detailsBtn.addEventListener('click', () => {
                const isHidden = stepsEl.style.display === 'none' || !stepsEl.style.display;
                stepsEl.style.display = isHidden ? 'block' : 'none';
                detailsBtn.textContent = isHidden ? 'Hide Details' : 'Details';
              });
            }
          }
          
          // Add save route button listener
          const saveBtn = div.querySelector('.save-route-btn');
          if(saveBtn){
            saveBtn.addEventListener('click', async () => {
              saveBtn.disabled = true;
              saveBtn.textContent = 'Saving...';
              
              const routeToSave = {
                origin: originVal,
                dest: destVal,
                origin_location: data.origin_location || originCoords,
                dest_location: data.dest_location || destCoords,
                distance_km: r.distance_km,
                eta_min: r.eta_min,
                geometry: r.geometry,
                ...r
              };
              
              await saveRoute(routeToSave);
              saveBtn.disabled = false;
              saveBtn.textContent = 'Save';
            });
          }
          
          // Add "Show on Map" button for all routes
          const showBtn = document.createElement('button');
          showBtn.className = 'btn small';
          showBtn.style.cssText = 'margin-top:4px; display:block; width:100%;';
          showBtn.textContent = 'Show on Map';
          showBtn.addEventListener('click', () => {
            currentRoute = r;
            
            // Use origin/dest from API response if available
            const finalOriginCoords = data.origin_location || originCoords;
            const finalDestCoords = data.dest_location || destCoords;
            
            debug('Show on Map clicked. Route geometry: ' + (r.geometry ? 'present' : 'missing'));
            debug('Origin coords: ' + JSON.stringify(finalOriginCoords) + ', Dest coords: ' + JSON.stringify(finalDestCoords));
            
            // Ensure map is initialized before attempting to display
            if(!map && !leafletMap){
              debug('Map not initialized, initializing Leaflet...');
              initLeafletMap(mapEl);
            }
            
            // Small delay to ensure map is ready after initialization
            setTimeout(() => {
              // Display on Google Maps
              if(map && googleMapsLoaded){
                debug('Showing route on Google Maps');
                displayRouteOnGoogleMap(finalOriginCoords, finalDestCoords, r);
              } 
              // Display on Leaflet
              else if(leafletMap){
                debug('Showing route on Leaflet');
                // Always try to display, even if geometry is missing (will use fallback)
                displayRouteOnLeaflet(finalOriginCoords, finalDestCoords, r.geometry);
              } else {
                debug('No map available after init attempt');
                alert('Map is not available. Please refresh the page.');
              }
            }, 100);
            
            // Scroll to map
            const mapPanel = document.querySelector('.map-panel');
            if(mapPanel){
              mapPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            
            // Highlight selected route
            document.querySelectorAll('.route-item').forEach(item => item.classList.remove('selected'));
            div.classList.add('selected');
          });
          div.querySelector('div:last-child').appendChild(showBtn);
          // Add start navigation button for server-provided routes
          const startBtn = document.createElement('button');
          startBtn.className = 'btn small';
          startBtn.style.cssText = 'margin-top:4px; display:block; width:100%; background:#2ecc71;';
          startBtn.textContent = 'Start';
          startBtn.addEventListener('click', () => {
            currentRoute = r;
            const finalOriginCoords = data.origin_location || originCoords;
            const finalDestCoords = data.dest_location || destCoords;
            try{ startNavigation(r, finalOriginCoords, finalDestCoords); }catch(e){ debug('startNavigation error: '+e.message); }
          });
          div.querySelector('div:last-child').appendChild(startBtn);
          
          routesEl.appendChild(div);
          sumEta += r.eta_min;
        });
        
        avgEtaEl.textContent = Math.round(sumEta / data.routes.length);
      } else {
        routesEl.innerHTML = '<div class="error-state muted">No routes found</div>';
      }
    }catch(e){
      console.error('findRoutes failed', e);
      findRoutesBtn.disabled = false;
      findRoutesBtn.textContent = 'Find Routes';
      routesEl.innerHTML = `<div class="error-state muted">Error: ${e.message}</div>`;
    }
  }

  // socket updates
  if(socket){
    socket.on('traffic_update', payload => {
      debug('socket traffic_update: count=' + (payload.areas && payload.areas.length));
      renderAreas(payload.areas);
      updateAnalytics(payload.areas);
      document.querySelectorAll('.area').forEach(el=> {
        try{ el.animate([{transform:'scale(1)'},{transform:'scale(1.02)'},{transform:'scale(1)'}],{duration:600, easing:'ease-out'}); }catch(e){}
      });
    });

    socket.on('connect', ()=> setStatus('connected', 'var(--accent-2)'));
    socket.on('connect_error', ()=> setStatus('no backend', '#ff6b6b'));
    socket.on('disconnect', ()=> setStatus('disconnected', '#ff9f43'));
  } else {
    debug('no socket: realtime disabled');
  }

  // observe the main container to detect accidental clears
  try{
    const main = document.querySelector('main');
    if(main){
      const mo = new MutationObserver(muts=>{ debug('main children: ' + main.querySelectorAll('*').length); });
      mo.observe(main, { childList:true, subtree:true });
    }
  }catch(e){/* ignore */}

  // UI events
  refreshBtn.addEventListener('click', ()=> {
    if(socket && socket.connected){ socket.emit('request_update'); }
    fetchTraffic();
    fetchTransit();
  });
  findRoutesBtn.addEventListener('click', ()=> {
    findRoutes();
  });
  
  // Allow Enter key to trigger route search
  originIn.addEventListener('keypress', (e) => {
    if(e.key === 'Enter') findRoutes();
  });
  destIn.addEventListener('keypress', (e) => {
    if(e.key === 'Enter') findRoutes();
  });

  // Auth UI setup
  const authBtn = document.getElementById('authBtn');
  const savedRoutesBtn = document.getElementById('savedRoutesBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const authModal = document.getElementById('authModal');
  const savedRoutesModal = document.getElementById('savedRoutesModal');
  
  function updateAuthUI() {
    if (currentUser) {
      authBtn.style.display = 'none';
      savedRoutesBtn.style.display = 'inline-block';
      logoutBtn.style.display = 'inline-block';
    } else {
      authBtn.style.display = 'inline-block';
      savedRoutesBtn.style.display = 'none';
      logoutBtn.style.display = 'none';
    }
  }
  
  authBtn.addEventListener('click', showAuthModal);
  logoutBtn.addEventListener('click', () => {
    logoutUser();
    updateAuthUI();
  });
  
  document.getElementById('authModalClose').addEventListener('click', () => {
    authModal.style.display = 'none';
  });
  
  document.getElementById('savedRoutesModalClose').addEventListener('click', () => {
    savedRoutesModal.style.display = 'none';
  });
  
  // Auth tab switching
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
      tab.classList.add('active');
      const formId = tab.dataset.tab + 'Tab';
      document.getElementById(formId).classList.add('active');
    });
  });
  
  // Login functionality
  document.getElementById('loginBtn').addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    
    if (!email || !password) {
      errorEl.textContent = 'Please fill in all fields';
      errorEl.style.display = 'block';
      return;
    }
    
    try {
      await loginUser(email, password);
      authModal.style.display = 'none';
      updateAuthUI();
      document.getElementById('loginEmail').value = '';
      document.getElementById('loginPassword').value = '';
      errorEl.style.display = 'none';
    } catch (error) {
      errorEl.textContent = error.message;
      errorEl.style.display = 'block';
    }
  });
  
  // Register functionality
  document.getElementById('registerBtn').addEventListener('click', async () => {
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const errorEl = document.getElementById('registerError');
    
    if (!name || !email || !password) {
      errorEl.textContent = 'Please fill in all fields';
      errorEl.style.display = 'block';
      return;
    }
    
    if (password.length < 6) {
      errorEl.textContent = 'Password must be at least 6 characters';
      errorEl.style.display = 'block';
      return;
    }
    
    try {
      await registerUser(email, password, name);
      authModal.style.display = 'none';
      updateAuthUI();
      document.getElementById('registerName').value = '';
      document.getElementById('registerEmail').value = '';
      document.getElementById('registerPassword').value = '';
      errorEl.style.display = 'none';
    } catch (error) {
      errorEl.textContent = error.message;
      errorEl.style.display = 'block';
    }
  });
  
  // Saved routes functionality
  savedRoutesBtn.addEventListener('click', async () => {
    const savedRoutes = await getSavedRoutes();
    const savedRoutesList = document.getElementById('savedRoutesList');
    
    if (savedRoutes.length === 0) {
      savedRoutesList.innerHTML = '<div class="muted">No saved routes yet</div>';
    } else {
      savedRoutesList.innerHTML = '';
      savedRoutes.forEach(route => {
        const div = document.createElement('div');
        div.className = 'saved-route-item';
        div.innerHTML = `
          <div class="saved-route-info">
            <h4>${route.origin_address || 'Unknown'} → ${route.dest_address || 'Unknown'}</h4>
            <p>${route.distance_km} km • ${route.duration_min} min</p>
          </div>
          <div class="saved-route-actions">
            <button class="btn small view-route-btn">View</button>
            <button class="btn small delete-route-btn" style="background:#ff6b6b;">Delete</button>
          </div>
        `;
        
        const viewBtn = div.querySelector('.view-route-btn');
        const deleteBtn = div.querySelector('.delete-route-btn');
        
        viewBtn.addEventListener('click', () => {
          // Display route on map
          const routeData = route.route_data ? (typeof route.route_data === 'string' ? JSON.parse(route.route_data) : route.route_data) : route;
          const originCoords = { lat: route.origin_lat, lng: route.origin_lng };
          const destCoords = { lat: route.dest_lat, lng: route.dest_lng };
          
          if (map && googleMapsLoaded) {
            displayRouteOnGoogleMap(originCoords, destCoords, routeData);
          } else if (leafletMap) {
            displayRouteOnLeaflet(originCoords, destCoords, routeData.geometry);
          }
          
          savedRoutesModal.style.display = 'none';
          const mapPanel = document.querySelector('.map-panel');
          if (mapPanel) mapPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        
        deleteBtn.addEventListener('click', async () => {
          if (confirm('Delete this route?')) {
            await deleteSavedRoute(route.id);
            div.remove();
            if (savedRoutesList.children.length === 0) {
              savedRoutesList.innerHTML = '<div class="muted">No saved routes yet</div>';
            }
          }
        });
        
        savedRoutesList.appendChild(div);
      });
    }
    
    savedRoutesModal.style.display = 'flex';
  });
  
  updateAuthUI();

  // Admin summary removed per user request.

  // initial load
  loadConfig();
  fetchTraffic();
  fetchTransit();
  // initialize dashboard slideshow based on current selection
  setTimeout(()=>{
    const sel = (countrySelect && countrySelect.value) || localStorage.getItem('selectedCountry') || 'ALL';
    try{ updateDashboardForCountry(sel); }catch(e){ debug('initial dashboard update error: '+e.message); }
  }, 600);
  
  // Initialize fallback map immediately if Google Maps won't load
  // Check if Google Maps was requested but failed
  setTimeout(() => {
    if(!map && !leafletMap){
      debug('Map not initialized by loadConfig (likely no Google Maps API key), initializing Leaflet fallback');
      initLeafletMap(mapEl);
    } else if(map){
      debug('Google Maps initialized');
    } else if(leafletMap){
      debug('Leaflet map initialized');
    }
  }, 2000);

  // slide-in reveal
  const observers = document.querySelectorAll('.slide-in');
  const ioObserver = new IntersectionObserver(entries=>{
    entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('visible'); ioObserver.unobserve(e.target); } });
  }, {threshold:0.15});
  observers.forEach(o=>ioObserver.observe(o));

});
