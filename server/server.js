/**
 * NAVIFY BACKEND SERVER
 * Clean & stable version
 */

const express = require('express');
const cors = require('cors');

const app = express();

/* =========================
   Middleware
========================= */
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

app.use(express.json());

/* =========================
   Routes
========================= */

// Health check
app.get('/', (req, res) => {
  res.send('✅ NAVIFY backend is running 🚦');
});

// Example API route
app.get('/api/traffic', (req, res) => {
  res.json({
    timestamp: Date.now(),
    areas: [
      { id: 1, name: 'City Center', congestion: 65 },
      { id: 2, name: 'Airport Road', congestion: 40 },
      { id: 3, name: 'Industrial Area', congestion: 80 }
    ]
  });
});

/* =========================
   Server Startup
========================= */

const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`✅ Backend server running at http://${HOST}:${PORT}`);
  console.log(`✅ Test endpoint: http://${HOST}:${PORT}/api/traffic`);
});

module.exports = app;
