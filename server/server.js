/**
 * NAVIFY BACKEND SERVER
 * Clean & stable versionWith Socket.IO and API Routes
 */

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Initialize Express
const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for dev
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Database Initialization
const db = require('./config/database');

// Routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// Socket.IO Setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('⚡ Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });

  // Example: Echo ping
  socket.on('ping', (data) => {
    socket.emit('pong', { message: 'Server is alive', timestamp: Date.now() });
  });
});

// Periodic Traffic Simulation (for live map)
setInterval(() => {
  // Simulate some traffic updates
  const updates = [
    { id: '1', congestion: Math.floor(Math.random() * 100) },
    { id: '2', congestion: Math.floor(Math.random() * 100) },
    { id: '3', congestion: Math.floor(Math.random() * 100) }
  ];
  io.emit('trafficUpdate', { timestamp: Date.now(), areas: updates });
}, 5000);


// Health Check
app.get('/', (req, res) => {
  res.send({ status: 'ok', message: '✅ NAVIFY backend is running 🚦' });
});

// Server Startup
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Initialize DB then start server
db.initializeDatabase()
  .then(() => {
    server.listen(PORT, HOST, () => {
      console.log(`✅ Backend server running at http://${HOST}:${PORT}`);
      console.log(`✅ Socket.IO enabled`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
  });

module.exports = app;
