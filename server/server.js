const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const https = require('https');
const fs = require('fs');
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

// CORS configuration for separate frontend and backend
// Allow requests from the frontend portal and common dev origins
const allowedOrigins = [];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}
if (process.env.FRONTENDLINK) {
  allowedOrigins.push(process.env.FRONTENDLINK);
}
// Common development origins
allowedOrigins.push('http://localhost:3001', 'http://127.0.0.1:3001', 'http://localhost:5500', 'http://127.0.0.1:5500');

if (process.env.NODE_ENV === 'production') {
  app.use(cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : ['http://localhost:3001'],
    methods: ['GET','POST','PUT','DELETE'],
    credentials: true
  }));
} else {
  app.use(cors({
    origin: true, // reflect request origin (allows any origin in development)
    methods: ['GET','POST','PUT','DELETE'],
    credentials: true
  }));
}
app.use(express.json());

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
  // Initialize Socket.IO with CORS policy to allow frontend origins
  const socketOrigins = [];
  if (process.env.FRONTEND_URL) {
    socketOrigins.push(process.env.FRONTEND_URL);
  }
  if (process.env.FRONTENDLINK) {
    socketOrigins.push(process.env.FRONTENDLINK);
  }
  socketOrigins.push('http://localhost:3001', 'http://127.0.0.1:3001', 'http://localhost:5500', 'http://127.0.0.1:5500');
  
  const io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? (socketOrigins.length > 0 ? socketOrigins : ['http://localhost:3001'])
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
          console.log(`Backend API server running at https://${HOST}:${PORT}`);
          console.log(`API Documentation available at https://${HOST}:${PORT}/api-docs`);
          console.log(`\nNote: Frontend should be started separately. See README.md for instructions.`);
        });
      } catch (err) {
        console.error('Failed to read SSL key/cert, falling back to HTTP:', err.message);
        server = app.listen(PORT, HOST, () => {
          console.log(`Backend API server running at http://${HOST}:${PORT}`);
          console.log(`API Documentation available at http://${HOST}:${PORT}/api-docs`);
          console.log(`\nNote: Frontend should be started separately. See README.md for instructions.`);
        });
      }
    } else {
      server = app.listen(PORT, HOST, () => {
        console.log(`Backend API server running at http://${HOST}:${PORT}`);
        console.log(`API Documentation available at http://${HOST}:${PORT}/api-docs`);
        console.log(`\nNote: Frontend should be started separately. See README.md for instructions.`);
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
