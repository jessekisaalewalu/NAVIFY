# Navify Setup Guide

## Getting Started

Navify is a smart commuter app that provides real-time route suggestions, traffic information, and transit data based on your location.

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Google Maps API Key (optional but recommended for full functionality)

## Installation

1. Install server dependencies:
```bash
cd server
npm install
```

2. Set up your API Keys:

   **Option A: Geoapify API (Recommended)**
   - Go to [Geoapify](https://www.geoapify.com/) and sign up for a free account
   - Get your API key from the dashboard
   - Set the API key as an environment variable:
   
   **Windows (PowerShell):**
   ```powershell
   $env:GEOAPIFY_API_KEY="YOUR_GEOAPIFY_KEY_HERE"
   ```
   
   **Windows (CMD):**
   ```cmd
   set GEOAPIFY_API_KEY=YOUR_GEOAPIFY_KEY_HERE
   ```
   
   **Linux/Mac:**
   ```bash
   export GEOAPIFY_API_KEY="YOUR_GEOAPIFY_KEY_HERE"
   ```

   **Option B: Google Maps API (Alternative)**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the following APIs:
     - Maps JavaScript API
     - Directions API
     - Places API
     - Geocoding API
   - Create credentials (API Key)
   - Set the API key as an environment variable:
   
   **Windows (PowerShell):**
   ```powershell
   $env:MAPS_API_KEY="YOUR_GOOGLE_MAPS_KEY_HERE"
   ```
   
   **Windows (CMD):**
   ```cmd
   set MAPS_API_KEY=YOUR_GOOGLE_MAPS_KEY_HERE
   ```
   
   **Linux/Mac:**
   ```bash
   export MAPS_API_KEY="YOUR_GOOGLE_MAPS_KEY_HERE"
   ```
   
   **Note:** You can use both APIs - Geoapify will be used first if available, with Google Maps as a fallback.

3. Start the server:
```bash
cd server
npm start
```

The server will start on `http://localhost:3000`

## Features

### With Geoapify API Key (Recommended):
- ✅ Real-time route finding with multiple alternatives
- ✅ Address to coordinates conversion (geocoding)
- ✅ Step-by-step directions
- ✅ Route visualization on map
- ✅ Works worldwide with accurate routing

### With Google Maps API Key (Alternative):
- ✅ Real-time route finding with multiple alternatives
- ✅ Interactive map with directions
- ✅ Address autocomplete
- ✅ Step-by-step directions
- ✅ Location-based transit information
- ✅ User location detection

### Without API Key (Fallback Mode):
- ✅ Mock route suggestions
- ✅ Basic traffic visualization
- ✅ Mock transit information
- ⚠️ Limited functionality (no real routes)

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. Allow location access when prompted (for best experience)
3. Enter a destination in the "To" field
4. Click "Find Routes" to see route options
5. Click "Show on Map" to view a route on the map
6. Click "Details" to see step-by-step directions

## API Endpoints

- `GET /api/traffic` - Get current traffic data
- `GET /api/routes?origin=...&dest=...` - Get route suggestions
- `GET /api/transit?lat=...&lng=...` - Get transit information
- `GET /api/geocode?address=...` - Geocode an address
- `GET /api/config` - Get server configuration

## Troubleshooting

### Routes not showing:
- Make sure you've entered a valid destination
- Check that your Google Maps API key is set correctly
- Verify that the Directions API is enabled in Google Cloud Console

### Map not loading:
- Check browser console for errors
- Verify Maps JavaScript API is enabled
- Ensure API key has proper restrictions (if any)

### Location not working:
- Make sure you've allowed location access in your browser
- Check that your browser supports geolocation API
- Try using HTTPS (some browsers require it for geolocation)

## Development

The app uses:
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Node.js, Express, Socket.IO
- **APIs**: Google Maps (Directions, Places, Geocoding)

## License

This is a demo project for educational purposes.

