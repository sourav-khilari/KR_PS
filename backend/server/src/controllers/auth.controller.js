import { loginUser } from '../services/auth.service.js';
import { validateLoginRequest } from '../validators/auth.validator.js';

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
