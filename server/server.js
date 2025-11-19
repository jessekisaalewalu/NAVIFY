const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
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
app.use(cors({
  origin: ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:3000'],
  methods: ['GET','POST','PUT','DELETE'],
  credentials: true
}));
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
      origin: ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:3000'],
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

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    await seedTrafficData();
    
    const PORT = 3000;
    
    const server = app.listen(PORT, "127.0.0.1", () => {
      console.log(`Server running at http://127.0.0.1:${PORT}`);
    });

    // Setup Socket.IO after server is created
    const io = setupSocketIO(server);
    
    // Start traffic update interval
    setInterval(() => broadcastTrafficUpdate(io), 8000);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
