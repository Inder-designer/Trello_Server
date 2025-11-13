import { Request, Response, NextFunction } from 'express';
import User from '../../models/User/User';
import { catchAsyncErrors } from '../../middleware/catchAsyncErrors';
import ErrorHandler from '../../Utils/errorhandler';
import { IUser } from '../../types/IUser';

// Get lock panel status
export const getLockStatus = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.user as IUser)?._id;

    if (!userId) {
        return next(new ErrorHandler('User not authenticated', 401));
    }

    const user = await User.findById(userId).select('lockPinEnabled');

    if (!user) {
        return next(new ErrorHandler('User not found', 404));
    }

    res.status(200).json({
        success: true,
        lockPinEnabled: user.lockPinEnabled,
    });
});

// Set lock PIN (first time)
export const setLockPin = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.user as IUser)?._id;
    const { pin } = req.body;

    if (!userId) {
        return next(new ErrorHandler('User not authenticated', 401));
    }

    if (!pin || !/^\d{4,6}$/.test(pin)) {
        return next(new ErrorHandler('PIN must be 4-6 digits', 400));
    }

    const user = await User.findById(userId);

    if (!user) {
        return next(new ErrorHandler('User not found', 404));
    }

    if (user.lockPinEnabled) {
        return next(new ErrorHandler('Lock PIN already set. Use change PIN endpoint.', 400));
    }

    user.lockPin = pin; // Will be hashed by pre-save hook
    user.lockPinEnabled = true;
    await user.save();

    res.status(200).json({
        success: true,
        message: 'Lock PIN set successfully',
        lockPinEnabled: true,
    });
});

// Change lock PIN
export const changeLockPin = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.user as IUser)?._id;
    const { currentPin, newPin } = req.body;

    if (!userId) {
        return next(new ErrorHandler('User not authenticated', 401));
    }

    if (!currentPin || !newPin) {
        return next(new ErrorHandler('Current PIN and new PIN are required', 400));
    }

    if (!/^\d{4,6}$/.test(newPin)) {
        return next(new ErrorHandler('New PIN must be 4-6 digits', 400));
    }

    const user = await User.findById(userId);

    if (!user) {
        return next(new ErrorHandler('User not found', 404));
    }

    if (!user.lockPinEnabled || !user.lockPin) {
        return next(new ErrorHandler('Lock PIN not set', 400));
    }

    const isCurrentPinValid = await user.compareLockPin(currentPin);

    if (!isCurrentPinValid) {
        return next(new ErrorHandler('Current PIN is incorrect', 401));
    }

    user.lockPin = newPin; // Will be hashed by pre-save hook
    await user.save();

    res.status(200).json({
        success: true,
        message: 'Lock PIN changed successfully',
    });
});

// Verify lock PIN
export const verifyLockPin = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.user as IUser)?._id;
    const { pin } = req.body;

    if (!userId) {
        return next(new ErrorHandler('User not authenticated', 401));
    }

    if (!pin) {
        return next(new ErrorHandler('PIN is required', 400));
    }

    const user = await User.findById(userId);

    if (!user) {
        return next(new ErrorHandler('User not found', 404));
    }

    if (!user.lockPinEnabled || !user.lockPin) {
        return next(new ErrorHandler('Lock PIN not set', 400));
    }

    const isPinValid = await user.compareLockPin(pin);

    if (!isPinValid) {
        return next(new ErrorHandler('Incorrect PIN', 401));
    }

    res.status(200).json({
        success: true,
        message: 'PIN verified successfully',
    });
});

// Disable lock PIN
export const disableLockPin = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.user as IUser)?._id;
    const { currentPin } = req.body;

    if (!userId) {
        return next(new ErrorHandler('User not authenticated', 401));
    }

    if (!currentPin) {
        return next(new ErrorHandler('Current PIN is required', 400));
    }

    const user = await User.findById(userId);

    if (!user) {
        return next(new ErrorHandler('User not found', 404));
    }

    if (!user.lockPinEnabled || !user.lockPin) {
        return next(new ErrorHandler('Lock PIN not set', 400));
    }

    const isPinValid = await user.compareLockPin(currentPin);

    if (!isPinValid) {
        return next(new ErrorHandler('Current PIN is incorrect', 401));
    }

    user.lockPin = undefined;
    user.lockPinEnabled = false;
    await user.save();

    res.status(200).json({
        success: true,
        message: 'Lock PIN disabled successfully',
        lockPinEnabled: false,
    });
});
