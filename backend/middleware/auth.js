const User = require('../models/User');

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const isAdmin = await User.isAdmin(req.session.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Error checking permissions' });
  }
};

// Middleware to get current user info
const getCurrentUser = async (req, res, next) => {
  try {
    if (req.session && req.session.userId) {
      const user = await User.getById(req.session.userId);
      req.user = user;
    }
    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  requireAuth,
  requireAdmin,
  getCurrentUser
};