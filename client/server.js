const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

// Serve static files from the client directory
app.use(express.static(path.join(__dirname)));

// Inject backend URL configuration into HTML
app.use((req, res, next) => {
  if (req.path === '/' || req.path.endsWith('.html')) {
    const originalSend = res.send;
    res.send = function(data) {
      if (typeof data === 'string' && data.includes('</head>')) {
        // Inject script to set API origin before app.js loads
        const script = `
  <script>
    window.__API_ORIGIN__ = '${BACKEND_URL}';
  </script>`;
        data = data.replace('</head>', script + '\n  </head>');
      }
      return originalSend.call(this, data);
    };
  }
  next();
});

// SPA fallback: serve index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Frontend server running at http://localhost:${PORT}`);
  console.log(`Backend API URL: ${BACKEND_URL}`);
  console.log(`\nAccess the application at: http://localhost:${PORT}`);
});

