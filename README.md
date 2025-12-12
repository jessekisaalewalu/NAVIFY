# 🚦 NAVIFY - Smart Traffic & Navigation System

![License](https://img.shields.io/badge/license-ISC-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)

**Navify** is a comprehensive, real-time navigation and traffic monitoring system. It leverages advanced backend technologies to provide real-time traffic updates, smart route suggestions, and transit data, all accessible through a responsive modern frontend.

---

## 🌟 Features

*   **Real-time Traffic Updates**: Live traffic data pushed to clients via Socket.IO.
*   **Smart Routing**: Intelligent route calculation using Geoapify (recommended) or Google Maps.
*   **User Authentication**: Secure signup and login with JWT and BCrypt.
*   **Saved Routes**: Users can save their favorite routes for quick access.
*   **Interactive Map**: Dynamic map interface for visualizing routes and traffic.
*   **Transit Data**: Integration with public transit schedules and stops.
*   **API Documentation**: Full Swagger documentation available for the backend API.

---

## 🛠 Tech Stack

### Client (Frontend)
*   **Framework**: [Vite](https://vitejs.dev/)
*   **Languages**: HTML5, CSS3, Vanilla JavaScript (ES6+)
*   **Deployment**: Vercel / Netlify / GitHub Pages

### Server (Backend)
*   **Runtime**: [Node.js](https://nodejs.org/)
*   **Framework**: [Express.js](https://expressjs.com/)
*   **Database**: [SQLite](https://www.sqlite.org/) (Lightweight, file-based)
*   **Real-time**: [Socket.IO](https://socket.io/)
*   **Deployment**: Render / Railway

---

## 🚀 Getting Started

Follow these instructions to set up the project locally on your machine.

### Prerequisites
*   **Node.js** (v20 or higher)
*   **npm** (Node Package Manager)
*   **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/jessekisaalewalu/NAVIFY.git
cd NAVIFY
```

### 2. Backend Setup
The backend handles API requests, database operations, and real-time sockets.

1.  Navigate to the server directory:
    ```bash
    cd server
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  **Configuration (.env)**:
    Create a `.env` file in the `server` directory with the following content:
    ```env
    # Server Configuration
    NODE_ENV=development
    PORT=3000
    HOST=127.0.0.1

    # Frontend URL (for CORS)
    FRONTEND_URL=http://localhost:3001
    
    # API Keys (Get these from their respective providers)
    # Geoapify: https://www.geoapify.com/
    GEOAPIFY_API_KEY=your_geoapify_key_here
    # Google Maps: https://console.cloud.google.com/
    MAPS_API_KEY=your_google_maps_key_here

    # Security (IMPORTANT: Change this!)
    JWT_SECRET=your_super_secret_jwt_key
    ```
4.  Start the server:
    ```bash
    npm run start:dev
    ```
    *The server will start on `http://localhost:3000`.*

### 3. Frontend Setup
The frontend is the user interface for the application.

1.  Open a new terminal and navigate to the client directory:
    ```bash
    cd client
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  **Configuration (.env)**:
    Create a `.env` file in the `client` directory:
    ```env
    # Application Config
    PORT=3001
    
    # Backend Connection
    BACKEND_URL=http://localhost:3000
    VITE_BACKEND_URL=http://localhost:3000
    ```
4.  Start the development server:
    ```bash
    npm run dev
    ```
    *The client will start on `http://localhost:3001` (or the port shown in terminal).*

---

## ☁️ Deployment Guide

### Backend Deployment (Render)
We recommend **Render** for hosting the Node.js backend.

1.  Push your code to GitHub.
2.  Go to [Render Dashboard](https://dashboard.render.com).
3.  Click **New +** -> **Web Service**.
4.  Connect your GitHub repository.
5.  **Important Settings**:
    *   **Root Directory**: `server`
    *   **Build Command**: `npm install`
    *   **Start Command**: `node server.js`
6.  **Environment Variables**:
    Add the variables from your `server/.env` file (e.g., `JWT_SECRET`, `node_env=production`).
    *   Set `FRONTEND_URL` to your production frontend URL (once deployed).
7.  Click **Create Web Service**.

### Frontend Deployment (Vercel)
We recommend **Vercel** for the Vite frontend.

1.  Go to [Vercel Dashboard](https://vercel.com).
2.  Click **Add New...** -> **Project**.
3.  Import your NAVIFY repository.
4.  **Framework Preset**: Select **Vite**.
5.  **Root Directory**: Edit and select `client`.
6.  **Environment Variables**:
    *   `VITE_BACKEND_URL`: The URL of your deployed Render backend (e.g., `https://navify-backend.onrender.com`).
7.  Click **Deploy**.

---

## 📚 API Documentation

When the backend server is running, you can access the full Swagger API documentation at:
`http://localhost:3000/api-docs`

**Key Endpoints:**
*   `GET /api/routes`: Calculate routes between points.
*   `GET /api/traffic`: Retrieve current traffic conditions.
*   `POST /api/auth/login`: Authenticate a user.
*   `GET /api/auth/profile`: Get current user details.

---

## ❓ Troubleshooting

*   **"Permission Denied" on Build**: Ensure your build script in `client/package.json` is executable. We've fixed this by ensuring `vite` is properly linked in dependencies.
*   **CORS Errors**: Check that the `FRONTEND_URL` in your backend `.env` matches your frontend's actual URL.
*   **Database Errors**: The SQLite database file is created automatically in `server/data`. Ensure the server has write permissions to this folder.

---

## 📄 License
This project is licensed under the ISC License.