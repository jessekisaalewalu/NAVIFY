# Environment Variables Setup Guide

This guide will help you set up the necessary `.env` files for both the backend and frontend servers.

## Backend Server (.env file)

Create a file named `.env` in the `server/` directory with the following content:

```env
# Navify Backend Server Configuration
# ====================================

# Environment
# Options: development, production, test
NODE_ENV=development

# Server Configuration
PORT=3000
HOST=127.0.0.1

# Frontend URL Configuration (for CORS)
# Set this to your frontend portal URL
FRONTEND_URL=http://localhost:3001
# Alternative frontend URL (legacy support)
FRONTENDLINK=http://localhost:3001

# API Keys (Optional - app works without them but with limited functionality)
# Get your Geoapify API key from: https://www.geoapify.com/
GEOAPIFY_API_KEY=

# Get your Google Maps API key from: https://console.cloud.google.com/
MAPS_API_KEY=

# JWT Secret Key (IMPORTANT: Change this in production!)
# Generate a strong random string for production use
JWT_SECRET=your-secret-key-change-in-production

# SSL/HTTPS Configuration (Optional)
# Uncomment and set paths if you want to run HTTPS
# SSL_KEY_PATH=./ssl/localhost.key
# SSL_CERT_PATH=./ssl/localhost.crt
# Or use inline certificates:
# SSL_KEY=
# SSL_CERT=
```

## Frontend Server (.env file)

Create a file named `.env` in the `client/` directory with the following content:

```env
# Navify Frontend Portal Configuration
# ====================================

# Frontend Server Port
PORT=3001

# Backend API URL
# This is where the frontend will connect to make API calls
BACKEND_URL=http://localhost:3000
```

## Quick Setup Commands

### Windows PowerShell:

**Backend:**
```powershell
cd server
@"
# Navify Backend Server Configuration
NODE_ENV=development
PORT=3000
HOST=127.0.0.1
FRONTEND_URL=http://localhost:3001
FRONTENDLINK=http://localhost:3001
GEOAPIFY_API_KEY=
MAPS_API_KEY=
JWT_SECRET=your-secret-key-change-in-production
"@ | Out-File -FilePath .env -Encoding utf8
```

**Frontend:**
```powershell
cd client
@"
# Navify Frontend Portal Configuration
PORT=3001
BACKEND_URL=http://localhost:3000
"@ | Out-File -FilePath .env -Encoding utf8
```

### Linux/Mac:

**Backend:**
```bash
cd server
cat > .env << 'EOF'
# Navify Backend Server Configuration
NODE_ENV=development
PORT=3000
HOST=127.0.0.1
FRONTEND_URL=http://localhost:3001
FRONTENDLINK=http://localhost:3001
GEOAPIFY_API_KEY=
MAPS_API_KEY=
JWT_SECRET=your-secret-key-change-in-production
EOF
```

**Frontend:**
```bash
cd client
cat > .env << 'EOF'
# Navify Frontend Portal Configuration
PORT=3001
BACKEND_URL=http://localhost:3000
EOF
```

## Environment Variables Explained

### Backend Variables:

- **NODE_ENV**: Set to `development` for local dev, `production` for production
- **PORT**: Backend server port (default: 3000)
- **HOST**: Backend server host (default: 127.0.0.1)
- **FRONTEND_URL**: Frontend portal URL for CORS configuration
- **FRONTENDLINK**: Alternative frontend URL (legacy support)
- **GEOAPIFY_API_KEY**: Geoapify API key for routing (optional but recommended)
- **MAPS_API_KEY**: Google Maps API key (optional alternative)
- **JWT_SECRET**: Secret key for JWT token signing (change in production!)
- **SSL_KEY_PATH / SSL_CERT_PATH**: Paths to SSL certificates for HTTPS (optional)

### Frontend Variables:

- **PORT**: Frontend server port (default: 3001)
- **BACKEND_URL**: Backend API server URL (default: http://localhost:3000)

## Important Notes

1. **Never commit `.env` files to version control** - they contain sensitive information
2. **Change JWT_SECRET in production** - use a strong, random string
3. **API keys are optional** - the app will work with mock data if not provided
4. **For production**, set `NODE_ENV=production` and use proper SSL certificates

