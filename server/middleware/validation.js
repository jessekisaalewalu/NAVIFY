const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// User validation rules
const validateRegister = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  handleValidationErrors
];

const validateLogin = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

// Route validation rules
const validateRouteQuery = [
  query('origin').notEmpty().withMessage('Origin is required'),
  query('dest').notEmpty().withMessage('Destination is required'),
  handleValidationErrors
];

const validateRouteCreate = [
  body('originAddress').notEmpty().withMessage('Origin address is required'),
  body('destAddress').notEmpty().withMessage('Destination address is required'),
  body('originLat').isFloat().withMessage('Valid origin latitude is required'),
  body('originLng').isFloat().withMessage('Valid origin longitude is required'),
  body('destLat').isFloat().withMessage('Valid destination latitude is required'),
  body('destLng').isFloat().withMessage('Valid destination longitude is required'),
  handleValidationErrors
];

// Transit validation
const validateTransitQuery = [
  query('lat').optional().isFloat().withMessage('Valid latitude is required'),
  query('lng').optional().isFloat().withMessage('Valid longitude is required'),
  handleValidationErrors
];

// Geocode validation
const validateGeocodeQuery = [
  query('address').notEmpty().withMessage('Address is required'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateRegister,
  validateLogin,
  validateRouteQuery,
  validateRouteCreate,
  validateTransitQuery,
  validateGeocodeQuery
};

