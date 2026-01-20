import jwt from 'jsonwebtoken';
import User from '../models/user.js';

// Verify JWT token
export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }

      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Admin only middleware
export const adminOnly = (req, res, next) => {
  if (req.user && req.user.userType === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin only.' });
  }
};

// Professor only middleware
export const professorOnly = (req, res, next) => {
  if (req.user && req.user.userType === 'professor') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Professor only.' });
  }
};

// Student only middleware
export const studentOnly = (req, res, next) => {
  if (req.user && req.user.userType === 'student') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Student only.' });
  }
};

// Class officer only (president, vp, secretary)
export const classOfficerOnly = (req, res, next) => {
  if (req.user && req.user.userType === 'student' && 
      ['president', 'vp', 'secretary'].includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Class officers only.' });
  }
};