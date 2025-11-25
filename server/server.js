const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const https = require('https');
const fs = require('fs');
const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Database initialization
const { initializeDatabase, seedTrafficData } = require('./config/database');
const TrafficArea = require('./models/TrafficArea');

// Routes and middleware
const apiRouter = require('./routes/api');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Navify API',
      version: '1.0.0',
      description: 'API documentation for Navify - Smart Commuter App',
      contact: {
        name: 'Navify Support',
        email: 'support@navify.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./routes/*.js', './controllers/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Allow requests from the frontend Live Server and local dev origins
// Allow CORS from common dev origins. In development allow any origin to ease local testing.
if (process.env.NODE_ENV === 'production') {
  app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:3000'],
    methods: ['GET','POST','PUT','DELETE'],
    credentials: true
  }));
} else {
  app.use(cors({
    origin: true, // reflect request origin
    methods: ['GET','POST','PUT','DELETE'],
    credentials: true
  }));
}
app.use(express.json());

// Serve client static files
const clientPath = path.join(__dirname, '..', 'client');
app.use('/', express.static(clientPath));

// API router
app.use('/api', apiRouter);

// Expose minimal config (maps API key) to the frontend if provided via env
app.get('/api/config', (req, res) => {
  const mapsKey = process.env.MAPS_API_KEY || null;
  const geoapifyKey = process.env.GEOAPIFY_API_KEY || null;
  res.json({ 
    mapsApiKey: mapsKey,
    geoapifyApiKey: geoapifyKey ? 'configured' : null // Don't expose the actual key to frontend
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// SPA fallback: serve index.html for routes not handled by API or static files
// Use '/*' instead of '*' to avoid path-to-regexp parameter parsing error
// Final SPA fallback: serve index.html for non-API GET requests.
// Use an unscoped middleware (app.use) to avoid path-to-regexp parsing issues
app.use((req, res, next) => {
  // Let API and Swagger routes be handled elsewhere
  if (req.path.startsWith('/api') || req.path.startsWith('/api-docs')) return next();
  // Only respond to GET requests for SPA navigation
  if (req.method !== 'GET') return next();
  res.sendFile(path.join(clientPath, 'index.html'));
});

// Broadcast traffic updates every 8 seconds using database
async function broadcastTrafficUpdate(io) {
  try {
    const areas = await TrafficArea.findAll();
    
    // Randomize congestion
    const updates = areas.map(area => ({
      id: area.id,
      congestion: Math.max(5, Math.min(95, area.congestion + Math.round((Math.random() - 0.5) * 20)))
    }));
    
    await TrafficArea.updateBulk(updates);
    
    const updatedAreas = await TrafficArea.findAll();
    io.emit('traffic_update', { timestamp: Date.now(), areas: updatedAreas });
  } catch (error) {
    console.error('Error broadcasting traffic update:', error);
  }
}

function setupSocketIO(server) {
  // Initialize Socket.IO with CORS policy to allow Live Server origins
  const io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:3000']
        : true,
      methods: ['GET','POST']
    }
  });

  io.on('connection', async (socket) => {
    console.log('Client connected:', socket.id);
    
    // Send initial snapshot from database
    try {
      const areas = await TrafficArea.findAll();
      socket.emit('traffic_update', { timestamp: Date.now(), areas });
    } catch (error) {
      console.error('Error sending initial traffic data:', error);
    }

    // Allow client to request a single update
    socket.on('request_update', async () => {
      try {
        const areas = await TrafficArea.findAll();
        socket.emit('traffic_update', { timestamp: Date.now(), areas });
      } catch (error) {
        console.error('Error handling request_update:', error);
      }
    });
  });

  return io;
}

// Initialize database and start server (only when running normally)
async function startServer() {
  try {
    await initializeDatabase();
    await seedTrafficData();

    const PORT = process.env.PORT || 3000;
    const HOST = process.env.HOST || '127.0.0.1';

    let server;
    // If SSL key and cert are provided, start HTTPS server
    const keyPath = process.env.SSL_KEY_PATH || process.env.SSL_KEY || null;
    const certPath = process.env.SSL_CERT_PATH || process.env.SSL_CERT || null;

    if (keyPath && certPath) {
      try {
        const key = fs.readFileSync(keyPath);
        const cert = fs.readFileSync(certPath);
        server = https.createServer({ key, cert }, app).listen(PORT, HOST, () => {
          console.log(`Server running at https://${HOST}:${PORT}`);
        });
      } catch (err) {
        console.error('Failed to read SSL key/cert, falling back to HTTP:', err.message);
        server = app.listen(PORT, HOST, () => {
          console.log(`Server running at http://${HOST}:${PORT}`);
        });
      }
    } else {
      server = app.listen(PORT, HOST, () => {
        console.log(`Server running at http://${HOST}:${PORT}`);
      });
    }

    // Setup Socket.IO after server is created
      const io = setupSocketIO(server);

      // Periodically aggregate incoming GPS pings into traffic areas and broadcast
      const { aggregatePings } = require('./controllers/trafficController');
      setInterval(async () => {
        try{
          await aggregatePings();
        }catch(e){ console.error('Periodic aggregatePings failed', e); }
        broadcastTrafficUpdate(io);
      }, 8000);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Only start the server when not in a test environment. This allows Supertest
// to import the Express `app` directly without the server already listening.
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = app;
