import jwt from 'jsonwebtoken';
import { ROLE_PERMISSIONS } from '../constants/roles.js';
import { User } from '../models/User.js';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required');
  }
  return secret;
}

export function signAccessToken(user) {
  return jwt.sign(
    {
      sub: String(user._id),
      role: user.role
    },
    getJwtSecret(),
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d'
    }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, getJwtSecret());
}

export async function loginUser({ usernameOrEmail, password }) {
  const lookup = usernameOrEmail.toLowerCase();
  const user = await User.findOne({
    $or: [{ username: lookup }, { email: lookup }]
  }).select('+password');

  if (!user) {
    const error = new Error('Invalid username/email or password');
    error.statusCode = 401;
    throw error;
  }

  if (!user.isActive) {
    const error = new Error('User account is inactive');
    error.statusCode = 403;
    throw error;
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    const error = new Error('Invalid username/email or password');
    error.statusCode = 401;
    throw error;
  }

  const token = signAccessToken(user);
  const safeUser = user.toSafeObject();

  return {
    token,
    user: {
      ...safeUser,
      permissions: ROLE_PERMISSIONS[user.role] || []
    }
  };
}
