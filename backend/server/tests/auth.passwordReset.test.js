import { describe, expect, it } from 'vitest';
import {
  validateForgotPasswordRequest,
  validateOtpRequest,
  validateResetPasswordRequest
} from '../src/validators/auth.validator.js';

describe('password reset validation', () => {
  it('accepts a valid email for forgot password', () => {
    const result = validateForgotPasswordRequest({ email: 'user@example.com' });
    expect(result.isValid).toBe(true);
    expect(result.value.email).toBe('user@example.com');
  });

  it('requires a 6-digit otp for verification', () => {
    const result = validateOtpRequest({ email: 'user@example.com', otp: '12345' });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('OTP must be 6 digits');
  });

  it('requires matching passwords for reset', () => {
    const result = validateResetPasswordRequest({
      email: 'user@example.com',
      password: 'NewPass123!',
      confirmPassword: 'Different123!'
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Passwords do not match');
  });
});
