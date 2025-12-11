const { geocodeAddress } = require('../utils/geocode');

const geocode = async (req, res, next) => {
  try {
    const { address, country } = req.query;

    const location = await geocodeAddress(address, country);
    if (location) {
      res.json({
        address: location.address,
        location: { lat: location.lat, lng: location.lng }
      });
    } else {
      res.status(404).json({ error: 'Address not found' });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  geocode
};

