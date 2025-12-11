const User = require('../models/User');

const register = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    const user = await User.create({ email, password, name });
    const token = User.generateToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      user: { id: user.id, email: user.email, name: user.name },
      token
    });
  } catch (error) {
    if (error.message === 'Email already exists') {
      return res.status(409).json({ error: error.message });
    }
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await User.verifyPassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = User.generateToken(user);

    res.json({
      message: 'Login successful',
      user: { id: user.id, email: user.email, name: user.name },
      token
    });
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const userId = req.user.id;

    // Check if email is already in use by another user
    if (email && email !== req.user.email) {
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: 'Email already exists' });
      }
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;

    const updatedUser = await User.update(userId, updates);
    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile
};

