const jwt = require('jsonwebtoken');
const { User, Role, AuthRefreshSession } = require('../models');

const getAccessToken = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) return authHeader.split(' ')[1];
  const accessCookie = (req.headers.cookie || '').split(';').map((part) => part.trim())
    .find((part) => part.startsWith('luxhome_access='));
  if (!accessCookie) return null;
  try {
    return decodeURIComponent(accessCookie.slice('luxhome_access='.length));
  } catch {
    return null;
  }
};

const isTokenSessionActive = async (decoded) => {
  if (!decoded.sid) {
    return Number.isFinite(decoded.iat) && Date.now() - decoded.iat * 1000 <= 30 * 60 * 1000;
  }
  const session = await AuthRefreshSession.findByPk(decoded.sid, {
    attributes: ['revoked_at', 'expires_at'],
  });
  return Boolean(session && !session.revoked_at && new Date(session.expires_at).getTime() > Date.now());
};

/**
 * Middleware: Verify JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    const token = getAccessToken(req);
    if (!token) {
      return res.status(401).json({ success: false, message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!await isTokenSessionActive(decoded)) {
      return res.status(401).json({ success: false, message: 'Access token expired or revoked' });
    }

    const user = await User.findByPk(decoded.id, {
      include: [{ model: Role, as: 'role' }],
      attributes: { exclude: ['password_hash'] },
    });

    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, message: 'User not found or deactivated' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

/**
 * Middleware: Role-based access control
 * @param {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    const userRole = req.user.role?.name;
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(', ')}`,
      });
    }
    next();
  };
};

/**
 * Middleware: Optional JWT verification (for guest checkout & public APIs)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = getAccessToken(req);
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!await isTokenSessionActive(decoded)) return next();
      const user = await User.findByPk(decoded.id, {
        include: [{ model: Role, as: 'role' }],
        attributes: { exclude: ['password_hash'] },
      });
      if (user && user.is_active) {
        req.user = user;
      }
    }
  } catch (err) {
    // Silently continue without user
  }
  next();
};

module.exports = { authenticate, authorize, optionalAuth };
