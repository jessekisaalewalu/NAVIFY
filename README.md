Navify — Smart Commuter
======================

This repository contains a small demo app with a Node/Express backend and a static frontend.

Structure
---------
- `server/` - Express backend and API
- `client/` - Static frontend files (HTML, CSS, JS)

Running frontend and backend together (recommended)
-------------------------------------------------
The app is already configured so the backend serves the frontend static files. This is the simplest
way to run both on the same origin (no CORS or origin issues):

1. Start the backend server (it will serve the frontend at the same host/port):

```powershell
cd "d:\PERSONAL PROJECTS\NAVIFY\server"
npm install
npm start
```

2. Open your browser to http://localhost:3000

Notes:
- The client uses relative API URLs by default so requests are sent to the same origin that served the
	frontend. If you must run the frontend separately during development, you can override the backend
	origin by setting `window.__API_ORIGIN__ = 'http://localhost:3000'` before the main `js/app.js` script
	runs (or adjust `client/js/app.js`).
- If you want the server to be reachable from other devices on your network, consider changing the
	listen host in `server/server.js` from `127.0.0.1` to `0.0.0.0` (be mindful of security implications).

Running the server with HTTPS (optional)
---------------------------------------
If you want the backend served over HTTPS (so the frontend is also served as https://localhost:3000),
you can start the server with an SSL key and certificate. The server looks for `SSL_KEY_PATH` and
`SSL_CERT_PATH` environment variables (or `SSL_KEY` / `SSL_CERT`) containing paths to the key and cert files.

1) Generate a self-signed certificate (OpenSSL example on Windows via PowerShell):

```powershell
cd d:\PERSONAL PROJECTS\NAVIFY\server
mkdir ssl
cd ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout localhost.key -out localhost.crt -subj "/CN=localhost"
```

2) Start the server with the SSL paths:

```powershell
$env:SSL_KEY_PATH = "d:\PERSONAL PROJECTS\NAVIFY\server\ssl\localhost.key";
$env:SSL_CERT_PATH = "d:\PERSONAL PROJECTS\NAVIFY\server\ssl\localhost.crt";
npm start
```

Now open https://localhost:3000 in your browser (you will need to accept the self-signed cert). The
frontend will be served from the same origin and port as the backend.

Security note: self-signed certificates are fine for local development only. For production use a
certificate issued by a trusted CA.

