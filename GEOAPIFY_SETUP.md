# Geoapify API Setup - Quick Guide

## Step 1: Get Your Geoapify API Key

1. Go to [https://www.geoapify.com/](https://www.geoapify.com/)
2. Sign up for a free account (or log in if you already have one)
3. Navigate to your dashboard/API keys section
4. Copy your API key

## Step 2: Set the API Key as Environment Variable

### Windows PowerShell:
```powershell
$env:GEOAPIFY_API_KEY="YOUR_API_KEY_HERE"
```

### Windows Command Prompt (CMD):
```cmd
set GEOAPIFY_API_KEY=YOUR_API_KEY_HERE
```

### Linux/Mac:
```bash
export GEOAPIFY_API_KEY="YOUR_API_KEY_HERE"
```

## Step 3: Start the Server

```bash
cd server
npm install  # If you haven't already
npm start
```

## Step 4: Test It

1. Open your browser to `http://localhost:3000`
2. Enter a destination (e.g., "New York, NY" or "London, UK")
3. Click "Find Routes"
4. You should see real routes from Geoapify!

## Example API Usage

The app will automatically:
- Convert addresses to coordinates using Geoapify Geocoding API
- Find routes using Geoapify Routing API
- Display routes on the map
- Show step-by-step directions

## Troubleshooting

**Routes not showing?**
- Check that the API key is set correctly: `echo $env:GEOAPIFY_API_KEY` (PowerShell) or `echo $GEOAPIFY_API_KEY` (Linux/Mac)
- Make sure the server was restarted after setting the environment variable
- Check the server console for any error messages

**Address not found?**
- Try using more specific addresses (include city, country)
- Or use coordinates directly (e.g., "40.7128,-74.0060")

## API Endpoint Example

The server uses Geoapify like this:
```
https://api.geoapify.com/v1/routing?waypoints=lat1,lng1|lat2,lng2&mode=drive&apiKey=YOUR_KEY
```

Your app handles all of this automatically - just set the API key and you're good to go!


