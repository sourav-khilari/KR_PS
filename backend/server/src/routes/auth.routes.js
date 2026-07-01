import { Router } from 'express';
import { forgotPassword, login, resetForgotPassword, verifyForgotPasswordOtp } from '../controllers/auth.controller.js';

const router = Router();

router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyForgotPasswordOtp);
router.post('/reset-password', resetForgotPassword);

export default router;
