# Deployment Steps

Follow these steps exactly to deploy NAVIFY.

## 1. Backend (Render)
1.  Go to [Render Dashboard](https://dashboard.render.com).
2.  Click **New +** -> **Web Service**.
3.  Connect your GitHub repository.
4.  Select the **server** directory as the **Root Directory** (this is important!).
5.  **Settings**:
    - **Name**: `navify-backend` (or similar)
    - **Runtime**: Node
    - **Build Command**: `npm install`
    - **Start Command**: `node server.js`
6.  **Environment Variables** (Advanced -> Add Environment Variable):
    - `PORT`: `3000`
    - `NODE_ENV`: `production`
7.  **Click Create Web Service**.
8.  **Wait** for it to deploy. Copy the URL (e.g., `https://navify-backend.onrender.com`).
9.  **Persistent Storage (Optional but Recommended)**:
    - Go to **Disks** in the dashboard sidebar.
    - Create a disk named `navify-data`, mount path `/opt/render/project/server/data`, Size `1GB`.
    - Attach it to your service. (Note: Only do this if you have a paid plan or credits; otherwise, data effectively resets on restart).

## 2. Frontend (Vercel)
1.  Go to [Vercel Dashboard](https://vercel.com/dashboard).
2.  Click **Add New...** -> **Project**.
3.  Import your NAVIFY repository.
4.  **Framework Preset**: Select **Vite**.
5.  **Root Directory**: Click "Edit" and select `client`.
6.  **Environment Variables**:
    - `VITE_BACKEND_URL`: Paste your Render backend URL (e.g., `https://navify-backend.onrender.com`).
7.  Click **Deploy**.

## 3. Verify
1.  Open your new Vercel URL.
2.  Check the "Connected" status.
3.  Try to Login/Register.
