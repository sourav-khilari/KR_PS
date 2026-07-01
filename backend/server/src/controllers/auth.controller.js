import { loginUser, requestPasswordResetOtp, verifyPasswordResetOtp, resetPassword } from '../services/auth.service.js';
import { validateLoginRequest, validateForgotPasswordRequest, validateOtpRequest, validateResetPasswordRequest } from '../validators/auth.validator.js';

export async function login(req, res, next) {
  try {
    const validation = validateLoginRequest(req.body);
    if (!validation.isValid) {
      const error = new Error(validation.errors.join(', '));
      error.statusCode = 400;
      throw error;
    }

    const result = await loginUser(validation.value);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const validation = validateForgotPasswordRequest(req.body);
    if (!validation.isValid) {
      const error = new Error(validation.errors.join(', '));
      error.statusCode = 400;
      throw error;
    }

    const result = await requestPasswordResetOtp(validation.value);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function verifyForgotPasswordOtp(req, res, next) {
  try {
    const validation = validateOtpRequest(req.body);
    if (!validation.isValid) {
      const error = new Error(validation.errors.join(', '));
      error.statusCode = 400;
      throw error;
    }

    const result = await verifyPasswordResetOtp(validation.value);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function resetForgotPassword(req, res, next) {
  try {
    const validation = validateResetPasswordRequest(req.body);
    if (!validation.isValid) {
      const error = new Error(validation.errors.join(', '));
      error.statusCode = 400;
      throw error;
    }

    const result = await resetPassword(validation.value);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
