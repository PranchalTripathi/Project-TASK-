console.log("JWT_SECRET from env:", process.env.JWT_SECRET);
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - user not found'
      });
    }
    
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }
    
    // Add user to request object
    req.user = user;
    next();
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Middleware to check if user owns the resource
const checkResourceOwnership = (resourceModel, resourceIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceIdParam];
      const userId = req.user._id;
      
      const Model = require(`../models/${resourceModel}`);
      const resource = await Model.findById(resourceId);
      
      if (!resource) {
        return res.status(404).json({
          success: false,
          message: `${resourceModel} not found`
        });
      }
      
      if (resource.userId.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied - you do not own this resource'
        });
      }
      
      req.resource = resource;
      next();
      
    } catch (error) {
      console.error('Resource ownership check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authorization check failed'
      });
    }
  };
};

// Middleware to generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { 
      expiresIn: '7d',
      issuer: 'slotswapper-api',
      audience: 'slotswapper-client'
    }
  );
};

// Middleware to refresh token if it's close to expiry
const refreshTokenIfNeeded = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return next();
    }
    
    const decoded = jwt.decode(token);
    const now = Date.now() / 1000;
    
    // If token expires in less than 1 day, send a new one
    if (decoded.exp - now < 24 * 60 * 60) {
      const newToken = generateToken(decoded.userId);
      res.setHeader('X-New-Token', newToken);
    }
    
    next();
    
  } catch (error) {
    // If there's an error, just continue without refreshing
    next();
  }
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return next();
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (user && user.isActive) {
      req.user = user;
    }
    
    next();
    
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

module.exports = {
  authenticateToken,
  checkResourceOwnership,
  generateToken,
  refreshTokenIfNeeded,
  optionalAuth
};