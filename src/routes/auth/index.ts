import { Router } from 'express';
import { forgotPassword, login, logout, resetPassword, signup, verifyOTP } from '../../Controllers/User/auth.controller';
const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout)
router.post('/forgot-password', forgotPassword)
router.post('/verify-otp', verifyOTP)
router.post('/reset-password', resetPassword)
export default router;