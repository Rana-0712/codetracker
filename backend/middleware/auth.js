const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify Clerk JWT token
const verifyClerkToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // For development, we'll use a simple token verification
    // In production, you should verify the Clerk JWT properly
    const decoded = jwt.decode(token);
    
    if (!decoded || !decoded.sub) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Find or create user
    let user = await User.findOne({ clerkId: decoded.sub });
    
    if (!user) {
      user = new User({
        clerkId: decoded.sub,
        email: decoded.email || `user_${decoded.sub}@example.com`,
        firstName: decoded.given_name || '',
        lastName: decoded.family_name || '',
        imageUrl: decoded.picture || ''
      });
      await user.save();
    }

    req.user = user;
    req.userId = user.clerkId;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Token verification failed' });
  }
};

// Simple auth middleware for development
const simpleAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // For development, extract userId from token
    const userId = token.replace('mock_session_token_', '').split('_')[0];
    
    if (!userId) {
      return res.status(401).json({ message: 'Invalid token format' });
    }

    req.userId = userId;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Authentication failed' });
  }
};

module.exports = { verifyClerkToken, simpleAuth };