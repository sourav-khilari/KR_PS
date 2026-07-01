import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
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

function createOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

async function sendPasswordResetOtpEmail(email, otp) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const fromAddress = process.env.SMTP_FROM || process.env.DEFAULT_ADMIN_EMAIL || 'no-reply@example.com';

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.log(`[password-reset] OTP for ${email}: ${otp}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });

  await transporter.sendMail({
    from: fromAddress,
    to: email,
    subject: 'Password reset OTP',
    text: `Your OTP is ${otp}. It expires in 10 minutes.`
  });
}

export async function requestPasswordResetOtp({ email }) {
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    return {
      success: true,
      message: 'If an account exists for that email, an OTP has been sent.'
    };
  }

  const otp = createOtp();
  user.passwordResetOtp = otp;
  user.passwordResetOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();
  await sendPasswordResetOtpEmail(email, otp);

  return {
    success: true,
    message: 'OTP has been sent to your email.'
  };
}

export async function verifyPasswordResetOtp({ email, otp }) {
  const user = await User.findOne({ email });
  if (!user || !user.passwordResetOtp || !user.passwordResetOtpExpiresAt) {
    const error = new Error('Invalid or expired OTP');
    error.statusCode = 400;
    throw error;
  }

  if (user.passwordResetOtp !== otp || new Date(user.passwordResetOtpExpiresAt) < new Date()) {
    const error = new Error('Invalid or expired OTP');
    error.statusCode = 400;
    throw error;
  }

  return {
    success: true,
    message: 'OTP verified successfully.'
  };
}

export async function resetPassword({ email, password }) {
  const user = await User.findOne({ email });
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  user.password = password;
  user.passwordResetOtp = undefined;
  user.passwordResetOtpExpiresAt = undefined;
  await user.save();

  return {
    success: true,
    message: 'Password reset successfully.'
  };
}
