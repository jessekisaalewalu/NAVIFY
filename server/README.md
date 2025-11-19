# Navify Server

Backend server for Navify - Smart Commuter App

## Features

- ✅ SQLite database integration
- ✅ JWT authentication
- ✅ RESTful API with complete CRUD operations
- ✅ Input validation middleware
- ✅ Error handling middleware
- ✅ Swagger/OpenAPI documentation
- ✅ Unit and integration tests (Jest + Supertest)
- ✅ Real-time traffic updates via Socket.IO

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set environment variables (optional):
```bash
# Windows PowerShell
$env:JWT_SECRET="your-secret-key"
$env:MAPS_API_KEY="your-google-maps-key"
$env:GEOAPIFY_API_KEY="your-geoapify-key"

# Linux/Mac
export JWT_SECRET="your-secret-key"
export MAPS_API_KEY="your-google-maps-key"
export GEOAPIFY_API_KEY="your-geoapify-key"
```

3. Start the server:
```bash
npm start
```

The server will:
- Initialize the SQLite database
- Seed initial traffic data
- Start on port 3000 (or PORT environment variable)
- API documentation available at `http://localhost:3000/api-docs`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (requires auth)

### Traffic
- `GET /api/traffic` - Get all traffic areas
- `GET /api/traffic/:id` - Get specific traffic area
- `POST /api/traffic` - Create traffic area (requires auth)
- `PUT /api/traffic/:id` - Update traffic area (requires auth)
- `PUT /api/traffic` - Bulk update traffic areas (requires auth)
- `DELETE /api/traffic/:id` - Delete traffic area (requires auth)

### Routes
- `GET /api/routes?origin=...&dest=...` - Get route suggestions
- `POST /api/routes` - Save a route (requires auth)
- `GET /api/routes/saved` - Get saved routes (requires auth)
- `GET /api/routes/saved/:id` - Get saved route (requires auth)
- `DELETE /api/routes/saved/:id` - Delete saved route (requires auth)

### Transit
- `GET /api/transit?lat=...&lng=...` - Get transit information
- `GET /api/transit/stops` - Get all transit stops
- `POST /api/transit/stops` - Create transit stop (requires auth)
- `PUT /api/transit/stops/:id` - Update transit stop (requires auth)
- `DELETE /api/transit/stops/:id` - Delete transit stop (requires auth)

### Geocode
- `GET /api/geocode?address=...` - Geocode an address

## Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Database Schema

### Users
- id (INTEGER PRIMARY KEY)
- email (TEXT UNIQUE)
- password (TEXT - hashed)
- name (TEXT)
- created_at, updated_at (DATETIME)

### Traffic Areas
- id (TEXT PRIMARY KEY)
- name (TEXT)
- congestion (INTEGER)
- lat, lng (REAL)
- created_at, updated_at (DATETIME)

### Routes
- id (TEXT PRIMARY KEY)
- user_id (INTEGER - FK to users)
- origin_address, dest_address (TEXT)
- origin_lat, origin_lng, dest_lat, dest_lng (REAL)
- distance_km (REAL)
- duration_min (INTEGER)
- route_data (TEXT - JSON)
- created_at, updated_at (DATETIME)

### Transit Stops
- id (INTEGER PRIMARY KEY)
- name, line (TEXT)
- lat, lng (REAL)
- status (TEXT)
- next_arrival_min (INTEGER)
- created_at, updated_at (DATETIME)

## Project Structure

```
server/
├── config/
│   └── database.js          # Database configuration
├── controllers/
│   ├── authController.js    # Authentication logic
│   ├── trafficController.js # Traffic management
│   ├── routeController.js   # Route operations
│   ├── transitController.js # Transit operations
│   └── geocodeController.js # Geocoding
├── middleware/
│   ├── auth.js              # JWT authentication
│   ├── validation.js         # Input validation
│   └── errorHandler.js      # Error handling
├── models/
│   ├── User.js              # User model
│   ├── TrafficArea.js       # Traffic area model
│   ├── Route.js             # Route model
│   └── TransitStop.js      # Transit stop model
├── routes/
│   └── api.js               # API routes
├── tests/
│   ├── setup.js             # Test setup
│   ├── auth.test.js         # Auth tests
│   ├── traffic.test.js      # Traffic tests
│   └── routes.test.js       # Route tests
├── data/
│   └── mock_traffic.json    # Initial traffic data
├── server.js                # Main server file
└── package.json
```

## License

This is a demo project for educational purposes.

