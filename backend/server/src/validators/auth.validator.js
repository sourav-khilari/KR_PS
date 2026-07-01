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
