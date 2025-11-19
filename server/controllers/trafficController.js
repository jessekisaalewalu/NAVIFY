const TrafficArea = require('../models/TrafficArea');

const getTraffic = async (req, res, next) => {
  try {
    const areas = await TrafficArea.findAll();
    res.json({
      timestamp: Date.now(),
      areas
    });
  } catch (error) {
    next(error);
  }
};

const getTrafficArea = async (req, res, next) => {
  try {
    const { id } = req.params;
    const area = await TrafficArea.findById(id);
    
    if (!area) {
      return res.status(404).json({ error: 'Traffic area not found' });
    }
    
    res.json(area);
  } catch (error) {
    next(error);
  }
};

const createTrafficArea = async (req, res, next) => {
  try {
    const area = await TrafficArea.create(req.body);
    res.status(201).json(area);
  } catch (error) {
    next(error);
  }
};

const updateTrafficArea = async (req, res, next) => {
  try {
    const { id } = req.params;
    const area = await TrafficArea.update(id, req.body);
    res.json(area);
  } catch (error) {
    next(error);
  }
};

const updateTrafficBulk = async (req, res, next) => {
  try {
    const { areas } = req.body;
    if (!Array.isArray(areas)) {
      return res.status(400).json({ error: 'Areas must be an array' });
    }
    
    await TrafficArea.updateBulk(areas);
    const updatedAreas = await TrafficArea.findAll();
    
    res.json({
      timestamp: Date.now(),
      areas: updatedAreas
    });
  } catch (error) {
    next(error);
  }
};

const deleteTrafficArea = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await TrafficArea.delete(id);
    
    if (!result.deleted) {
      return res.status(404).json({ error: 'Traffic area not found' });
    }
    
    res.json({ message: 'Traffic area deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTraffic,
  getTrafficArea,
  createTrafficArea,
  updateTrafficArea,
  updateTrafficBulk,
  deleteTrafficArea
};

