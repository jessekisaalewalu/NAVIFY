const express = require('express');
const router = express.Router();

// Controllers
const authController = require('../controllers/authController');
const trafficController = require('../controllers/trafficController');
const routeController = require('../controllers/routeController');
const transitController = require('../controllers/transitController');
const geocodeController = require('../controllers/geocodeController');

// Middleware
const { authenticate } = require('../middleware/auth');
const {
  validateRegister,
  validateLogin,
  validateRouteQuery,
  validateRouteCreate,
  validateTransitQuery,
  validateGeocodeQuery
} = require('../middleware/validation');

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       409:
 *         description: Email already exists
 */
router.post('/auth/register', validateRegister, authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/auth/login', validateLogin, authController.login);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *       401:
 *         description: Unauthorized
 */
router.get('/auth/profile', authenticate, authController.getProfile);

/**
 * @swagger
 * /api/traffic:
 *   get:
 *     summary: Get all traffic areas
 *     tags: [Traffic]
 *     responses:
 *       200:
 *         description: List of traffic areas
 */
router.get('/traffic', trafficController.getTraffic);

/**
 * @swagger
 * /api/traffic/{id}:
 *   get:
 *     summary: Get a specific traffic area
 *     tags: [Traffic]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Traffic area details
 *       404:
 *         description: Traffic area not found
 */
router.get('/traffic/:id', trafficController.getTrafficArea);

/**
 * @swagger
 * /api/traffic:
 *   post:
 *     summary: Create a new traffic area
 *     tags: [Traffic]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - name
 *             properties:
 *               id:
 *                 type: string
 *               name:
 *                 type: string
 *               congestion:
 *                 type: integer
 *               lat:
 *                 type: number
 *               lng:
 *                 type: number
 *     responses:
 *       201:
 *         description: Traffic area created
 */
router.post('/traffic', authenticate, trafficController.createTrafficArea);

/**
 * @swagger
 * /api/traffic/{id}:
 *   put:
 *     summary: Update a traffic area
 *     tags: [Traffic]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Traffic area updated
 */
router.put('/traffic/:id', authenticate, trafficController.updateTrafficArea);

/**
 * @swagger
 * /api/traffic:
 *   put:
 *     summary: Bulk update traffic areas
 *     tags: [Traffic]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               areas:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     congestion:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Traffic areas updated
 */
router.put('/traffic', authenticate, trafficController.updateTrafficBulk);

/**
 * @swagger
 * /api/traffic/{id}:
 *   delete:
 *     summary: Delete a traffic area
 *     tags: [Traffic]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Traffic area deleted
 */
router.delete('/traffic/:id', authenticate, trafficController.deleteTrafficArea);

/**
 * @swagger
 * /api/routes:
 *   get:
 *     summary: Get route suggestions
 *     tags: [Routes]
 *     parameters:
 *       - in: query
 *         name: origin
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: dest
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Route suggestions
 */
router.get('/routes', validateRouteQuery, routeController.getRoutes);

/**
 * @swagger
 * /api/routes:
 *   post:
 *     summary: Save a route
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - originAddress
 *               - destAddress
 *               - originLat
 *               - originLng
 *               - destLat
 *               - destLng
 *             properties:
 *               originAddress:
 *                 type: string
 *               originLat:
 *                 type: number
 *               originLng:
 *                 type: number
 *               destAddress:
 *                 type: string
 *               destLat:
 *                 type: number
 *               destLng:
 *                 type: number
 *               distanceKm:
 *                 type: number
 *               durationMin:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Route saved
 */
router.post('/routes', authenticate, validateRouteCreate, routeController.saveRoute);

/**
 * @swagger
 * /api/routes/saved:
 *   get:
 *     summary: Get saved routes for user
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of saved routes
 */
router.get('/routes/saved', authenticate, routeController.getSavedRoutes);

/**
 * @swagger
 * /api/routes/saved/{id}:
 *   get:
 *     summary: Get a saved route
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Route details
 */
router.get('/routes/saved/:id', authenticate, routeController.getSavedRoute);

/**
 * @swagger
 * /api/routes/saved/{id}:
 *   delete:
 *     summary: Delete a saved route
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Route deleted
 */
router.delete('/routes/saved/:id', authenticate, routeController.deleteSavedRoute);

/**
 * @swagger
 * /api/transit:
 *   get:
 *     summary: Get transit information
 *     tags: [Transit]
 *     parameters:
 *       - in: query
 *         name: lat
 *         schema:
 *           type: number
 *       - in: query
 *         name: lng
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Transit information
 */
router.get('/transit', validateTransitQuery, transitController.getTransit);

/**
 * @swagger
 * /api/transit/stops:
 *   get:
 *     summary: Get all transit stops
 *     tags: [Transit]
 *     responses:
 *       200:
 *         description: List of transit stops
 */
router.get('/transit/stops', transitController.getTransitStops);

/**
 * @swagger
 * /api/transit/stops:
 *   post:
 *     summary: Create a transit stop
 *     tags: [Transit]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Transit stop created
 */
router.post('/transit/stops', authenticate, transitController.createTransitStop);

/**
 * @swagger
 * /api/transit/stops/{id}:
 *   put:
 *     summary: Update a transit stop
 *     tags: [Transit]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transit stop updated
 */
router.put('/transit/stops/:id', authenticate, transitController.updateTransitStop);

/**
 * @swagger
 * /api/transit/stops/{id}:
 *   delete:
 *     summary: Delete a transit stop
 *     tags: [Transit]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transit stop deleted
 */
router.delete('/transit/stops/:id', authenticate, transitController.deleteTransitStop);

/**
 * @swagger
 * /api/geocode:
 *   get:
 *     summary: Geocode an address
 *     tags: [Geocode]
 *     parameters:
 *       - in: query
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Geocoded address
 *       404:
 *         description: Address not found
 */
router.get('/geocode', validateGeocodeQuery, geocodeController.geocode);

module.exports = router;
