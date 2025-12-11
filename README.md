# Navify — Smart Commuter

Real-time route suggestions, traffic info, and transit data for smart commuting.

## Quick Start

The frontend and backend run as separate servers for better separation of concerns.

### Starting the Backend Server

```powershell
cd server
npm install
npm start
```

Backend runs at http://localhost:3000

### Starting the Frontend Server

Open a new terminal:

```powershell
cd client
npm install
npm start
```

Frontend runs at http://localhost:3001

The frontend will automatically connect to the backend at http://localhost:3000.

### Custom Backend URL

To point the frontend to a different backend URL:

```powershell
$env:BACKEND_URL="http://your-backend-url:port"
cd client
npm start
```

Or set `FRONTEND_URL` environment variable on the backend to configure CORS:

```powershell
$env:FRONTEND_URL="http://localhost:3001"
cd server
npm start
```

## Features

- ✅ Real-time traffic updates via Socket.IO
- ✅ Smart route finding (Geoapify or Google Maps)
- ✅ User authentication & saved routes (SQLite + JWT)
- ✅ Complete CRUD operations for routes, traffic, transit
- ✅ Responsive web UI
- ✅ Full test coverage (Jest + Supertest)

## Project Structure

```
NAVIFY/
├── client/                  # Static frontend (HTML, CSS, JS)
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
├── server/                  # Express backend
│   ├── config/database.js
│   ├── controllers/         # API logic
│   ├── middleware/          # Auth, validation, error handling
│   ├── models/              # Database schemas
│   ├── routes/api.js        # API routes
│   ├── tests/               # Jest test suite
│   ├── server.js            # Main server entry
│   └── package.json
└── README.md
```

## Setup & Configuration

### Prerequisites
- Node.js 14+ and npm

### API Keys (Optional)

For real routing, configure one of these APIs via environment variables:

**Geoapify (Recommended):**
```powershell
$env:GEOAPIFY_API_KEY="YOUR_KEY"
```

**Google Maps (Alternative):**
```powershell
$env:MAPS_API_KEY="YOUR_KEY"
```

**No API Key?** App runs with mock data and basic fallback routes.

### Running with HTTPS

To serve over HTTPS (e.g., https://localhost:3000):

1. Generate a self-signed certificate:
```powershell
cd server
mkdir ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout ssl/localhost.key -out ssl/localhost.crt -subj "/CN=localhost"
```

2. Start with SSL env vars:
```powershell
$env:SSL_KEY_PATH = "path\to\server\ssl\localhost.key"
$env:SSL_CERT_PATH = "path\to\server\ssl\localhost.crt"
npm start
```

3. Open https://localhost:3000 (accept self-signed cert in browser)

## API Endpoints

### Auth
- `POST /api/auth/register` — Register user
- `POST /api/auth/login` — Login
- `GET /api/auth/profile` — Get profile (auth required)
- `PUT /api/auth/profile` — Update profile (auth required)

### Routes
- `GET /api/routes?origin=...&dest=...` — Find routes
- `POST /api/routes` — Save route (auth required)
- `GET /api/routes/saved` — Get saved routes (auth required)
- `GET /api/routes/saved/:id` — Get saved route (auth required)
- `PUT /api/routes/saved/:id` — Update saved route (auth required)
- `DELETE /api/routes/saved/:id` — Delete saved route (auth required)

### Traffic
- `GET /api/traffic` — Get all traffic areas
- `GET /api/traffic/:id` — Get traffic area
- `POST /api/traffic` — Create (auth required)
- `PUT /api/traffic/:id` — Update (auth required)
- `PUT /api/traffic` — Bulk update (auth required)
- `DELETE /api/traffic/:id` — Delete (auth required)

### Transit
- `GET /api/transit?lat=...&lng=...` — Get transit info
- `GET /api/transit/stops` — Get all stops
- `POST /api/transit/stops` — Create (auth required)
- `PUT /api/transit/stops/:id` — Update (auth required)
- `DELETE /api/transit/stops/:id` — Delete (auth required)

### Geocoding
- `GET /api/geocode?address=...` — Geocode address
- `GET /api/config` — Server config

## Testing

```powershell
cd server
npm test              # Run full test suite
npm run test:watch   # Watch mode
```

Test coverage: Auth, routes, traffic, transit, CRUD operations, error handling.

## Development Notes

- **Frontend:** Uses relative API URLs (no CORS issues)
- **Backend:** Express with SQLite, JWT auth, Socket.IO for real-time updates
- **Database:** SQLite with users, routes, traffic_areas, transit_stops tables
- **Swagger Docs:** Available at `/api-docs` when server is running

## Troubleshooting

**Routes not showing?**
- Set a Geoapify or Google Maps API key
- Restart server after setting env var

**Can't find app?**
- Ensure server is running: `npm start` (in server folder)
- Try http://localhost:3000

**Location not working?**
- Allow location access in browser
- Use HTTPS (some browsers require it)

## License

Demo project for educational purposes.