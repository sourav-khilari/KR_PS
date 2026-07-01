function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isStrongPassword(password) {
  return password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);
}

export function validateLoginRequest(body = {}) {
  const errors = [];
  const usernameOrEmail = String(body.usernameOrEmail || '').trim();
  const password = String(body.password || '');

  if (!usernameOrEmail) {
    errors.push('Username or email is required');
  }

  if (!password) {
    errors.push('Password is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: {
      usernameOrEmail,
      password
    }
  };
}

export function validateForgotPasswordRequest(body = {}) {
  const errors = [];
  const email = String(body.email || '').trim().toLowerCase();

  if (!email) {
    errors.push('Email is required');
  } else if (!isValidEmail(email)) {
    errors.push('Please enter a valid email address');
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: { email }
  };
}

export function validateOtpRequest(body = {}) {
  const errors = [];
  const email = String(body.email || '').trim().toLowerCase();
  const otp = String(body.otp || '').trim();

  if (!email) {
    errors.push('Email is required');
  } else if (!isValidEmail(email)) {
    errors.push('Please enter a valid email address');
  }

  if (!otp) {
    errors.push('OTP is required');
  } else if (!/^\d{6}$/.test(otp)) {
    errors.push('OTP must be 6 digits');
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: { email, otp }
  };
}

export function validateResetPasswordRequest(body = {}) {
  const errors = [];
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const confirmPassword = String(body.confirmPassword || '');

  if (!email) {
    errors.push('Email is required');
  } else if (!isValidEmail(email)) {
    errors.push('Please enter a valid email address');
  }

  if (!password) {
    errors.push('New password is required');
  } else if (!isStrongPassword(password)) {
    errors.push('Password must be at least 8 characters and include a number, uppercase letter, and special character');
  }

  if (!confirmPassword) {
    errors.push('Please confirm your password');
  } else if (password && confirmPassword && password !== confirmPassword) {
    errors.push('Passwords do not match');
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: { email, password, confirmPassword }
  };
}
