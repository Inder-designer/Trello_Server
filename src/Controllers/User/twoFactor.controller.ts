import { Request, Response, NextFunction } from 'express';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import User from '../../models/User/User';
import { catchAsyncErrors } from '../../middleware/catchAsyncErrors';
import ErrorHandler from '../../Utils/errorhandler';
import { IUser } from '../../types/IUser';

// Setup 2FA - Generate secret and QR code
export const setup2FA = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.user as IUser)?._id;

    if (!userId) {
        return next(new ErrorHandler('User not authenticated', 401));
    }

    const user = await User.findById(userId);

    if (!user) {
        return next(new ErrorHandler('User not found', 404));
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
        name: `Trello Clone (${user.email})`,
        length: 32,
    });
    console.log(secret);
    

    // Temporarily store secret (not enabled yet)
    user.twoFactorSecret = secret.base32;
    await user.save();

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    res.status(200).json({
        success: true,
        secret: secret.base32,
        qrCode: qrCodeUrl,
        message: 'Scan QR code with Google Authenticator app',
    });
});

// Verify and enable 2FA
export const enable2FA = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.user as IUser)?._id;
    const { token } = req.body;

    if (!token) {
        return next(new ErrorHandler('Verification code is required', 400));
    }

    const user = await User.findById(userId);

    if (!user) {
        return next(new ErrorHandler('User not found', 404));
    }

    if (!user.twoFactorSecret) {
        return next(new ErrorHandler('2FA setup not initiated. Please setup first.', 400));
    }

    // Verify the token
    const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: token,
        window: 2, // Allow 2 time steps before and after
    });
    console.log(verified);
    

    if (!verified) {
        return next(new ErrorHandler('Invalid verification code', 401));
    }

    // Enable 2FA
    user.twoFactorEnabled = true;
    await user.save();

    res.status(200).json({
        success: true,
        message: 'Two-Factor Authentication enabled successfully',
        twoFactorEnabled: true,
    });
});

// Disable 2FA
export const disable2FA = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.user as IUser)?._id;
    const { token, password } = req.body;

    if (!token || !password) {
        return next(new ErrorHandler('Verification code and password are required', 400));
    }
    const user = await User.findById(userId);

    if (!user) {
        return next(new ErrorHandler('User not found', 404));
    }

    if (!user.twoFactorEnabled) {
        return next(new ErrorHandler('2FA is not enabled', 400));
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
        return next(new ErrorHandler('Incorrect password', 401));
    }

    // Verify 2FA token
    const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret!,
        encoding: 'base32',
        token: token,
        window: 2,
    });

    if (!verified) {
        return next(new ErrorHandler('Invalid verification code', 401));
    }

    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();

    res.status(200).json({
        success: true,
        message: 'Two-Factor Authentication disabled successfully',
        twoFactorEnabled: false,
    });
});

// Get 2FA status
export const get2FAStatus = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.user as IUser)?._id;

    if (!userId) {
        return next(new ErrorHandler('User not authenticated', 401));
    }

    const user = await User.findById(userId).select('twoFactorEnabled');

    if (!user) {
        return next(new ErrorHandler('User not found', 404));
    }

    res.status(200).json({
        success: true,
        twoFactorEnabled: user.twoFactorEnabled || false,
    });
});

// Verify 2FA token (used during login)
export const verify2FAToken = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const { userId, token } = req.body;

    if (!userId || !token) {
        return next(new ErrorHandler('User ID and token are required', 400));
    }

    const user = await User.findById(userId);

    if (!user) {
        return next(new ErrorHandler('User not found', 404));
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
        return next(new ErrorHandler('2FA is not enabled for this user', 400));
    }

    const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: token,
        window: 2,
    });

    if (!verified) {
        return next(new ErrorHandler('Invalid verification code', 401));
    }

    res.status(200).json({
        success: true,
        message: '2FA verification successful',
    });
});
