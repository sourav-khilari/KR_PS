import { ROLE_PERMISSIONS } from '../constants/roles.js';
import { User } from '../models/User.js';
import { verifyAccessToken } from '../services/auth.service.js';

function extractBearerToken(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme?.toLowerCase() === 'bearer' && token) {
    return token;
  }

  if (req.query && req.query.token) {
    return req.query.token;
  }

  return null;
}

export async function requireAuth(req, _res, next) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      const error = new Error('Authentication token is required');
      error.statusCode = 401;
      throw error;
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);

    if (!user || !user.isActive) {
      const error = new Error('User is not authorized');
      error.statusCode = 401;
      throw error;
    }

    req.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      permissions: ROLE_PERMISSIONS[user.role] || []
    };

    next();
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 401;
      error.message = 'Invalid or expired authentication token';
    }
    next(error);
  }
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      const error = new Error('Authentication is required');
      error.statusCode = 401;
      next(error);
      return;
    }

    if (!roles.includes(req.user.role)) {
      const error = new Error('You do not have permission to perform this action');
      error.statusCode = 403;
      next(error);
      return;
    }

    next();
  };
}
