import { NextFunction, Request, Response } from 'express';
import { Session } from 'express-session';
import User from "../../models/User/User";
import { catchAsyncErrors } from "../../middleware/catchAsyncErrors";
import ErrorHandler from "../../Utils/errorhandler";
import sendToken from "../../Utils/jwtToken";
import ResponseHandler from "../../Utils/resHandler";
import OTP from "../../models/User/OtpSchema";
import passport, { session } from 'passport';
import { IUser } from '../../types/IUser';
import speakeasy from 'speakeasy';
import { v4 as uuidv4 } from 'uuid';

interface SessionWithId extends Session {
    sessionId?: string;
}

function getInitials(fullName: string): string {
    const parts = fullName.trim().split(" ").filter(Boolean);

    if (parts.length === 1) {
        const word = parts[0];
        return (word[0] + (word[1] || '')).toUpperCase();
    }
    return parts.map(p => p[0].toUpperCase()).join("");
}

async function generateUniqueUsername(fullName: string): Promise<string> {
    const base = fullName.trim().toLowerCase().replace(/\s+/g, ".");
    let username = base;
    let count = 0;

    while (await User.findOne({ userName: username })) {
        count += 1;
        username = `${base}${count}`;
    }

    return username;
}
export const signup = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const { fullName, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return next(new ErrorHandler("User already exists", 400));
    }

    const initials = getInitials(fullName);
    const userName = await generateUniqueUsername(fullName);

    const user = await User.create({
        fullName,
        email,
        password,
        initials,
        userName,

    });

    return ResponseHandler.send(res, "User registered successfully", user, 201);
});

export const login = (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", async (err: unknown, user: IUser, info: Record<string, unknown>) => {
        if (err) return next(err);
        if (!user) {
            return res.status(401).json({ message: info?.message || "Login failed" });
        }

        // Check if user has 2FA enabled
        if (user.twoFactorEnabled) {
            return res.status(200).json({
                message: "2FA required",
                require2FA: true,
                userId: user._id,
            });
        }

        // Generate new session ID and invalidate old sessions
        const newSessionId = uuidv4();
        user.sessionId = newSessionId;
        user.isActive = true;
        user.last_active = new Date();
        await user.save();

        // Create a session (only if 2FA is not enabled)
        req.logIn(user, (err) => {
            if (err) return next(err);

            // Store sessionId in session
            (req.session as SessionWithId).sessionId = newSessionId;

            return res.status(200).json({
                message: "Logged in successfully",
                user,
                sessionId: newSessionId,
            });
        });
    })(req, res, next);
};

export const logout = (req: Request, res: Response, next: NextFunction) => {
    // Clear sessionId from user document
    const user = req.user as IUser;
    if (user && user._id) {
        User.findByIdAndUpdate(user._id, { sessionId: null, isActive: false, last_active: new Date() }).catch((err) => {
            console.error("Failed to clear sessionId on logout:", err);
        });
    }

    req.logout((err) => {
        if (err) {
            return next(new ErrorHandler(err, 500));
        }
        res.clearCookie("connect.sid")
        req.session.destroy(() => { })
        return ResponseHandler.send(res, "Logged out successfully", null, 200)
    })
}

export const forgotPassword = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
        return next(new ErrorHandler("User not found", 404));
    }
    const otp = await OTP.generateOTP(user._id as import("mongoose").Types.ObjectId);
    return ResponseHandler.send(res, `OTP sent successfully ${otp.code}`, null, 200)
})

export const verifyOTP = catchAsyncErrors(async (req, res, next) => {
    const { otp, email } = req.body;
    if (!otp || (!email)) {
        return next(
            new ErrorHandler("Please provide OTP and email or phone number", 400)
        );
    }

    const user = await User.findOne({ email });
    if (!user) {
        return next(new ErrorHandler("User not found", 404));
    }
    const otpData = await OTP.verifyOTP(user._id as import("mongoose").Types.ObjectId, otp);
    if (!otpData) {
        return next(new ErrorHandler("OTP invalid or expired", 400));
    }
    await OTP.deleteOne({ userId: user._id, code: otp });
    const resetToken = await user.generateResetToken();
    return ResponseHandler.send(
        res,
        "Password reset token generated successfully",
        resetToken,
        200
    );
});

export const resetPassword = catchAsyncErrors(async (req, res, next) => {
    const { resetToken, password } = req.body;

    if (!resetToken || !password) {
        return next(
            new ErrorHandler("Reset token and new password are required", 400)
        );
    }
    const user = await User.verifyToken(resetToken);
    if (!user) {
        return next(new ErrorHandler("Invalid or expired reset token", 400));
    }
    user.password = password;
    await user.save();

    return ResponseHandler.send(res, "Password reset successful", {}, 200);
});

export const verify2FALogin = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const { userId, token } = req.body;

    if (!userId || !token) {
        return next(new ErrorHandler("User ID and 2FA token are required", 400));
    }

    const user = await User.findById(userId);
    if (!user) {
        return next(new ErrorHandler("User not found", 404));
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
        return next(new ErrorHandler("2FA is not enabled for this user", 400));
    }

    // Verify the 2FA token
    const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token,
        window: 2, // Allow 2 time steps (60 seconds) before and after
    });

    if (!verified) {
        return next(new ErrorHandler("Invalid 2FA token", 401));
    }

    // Generate new session ID and invalidate old sessions
    const newSessionId = uuidv4();
    user.sessionId = newSessionId;
    user.isActive = true;
    user.last_active = new Date();
    await user.save();

    // Create a session after successful 2FA verification
    req.logIn(user, (err) => {
        if (err) return next(err);

        // Store sessionId in session
        (req.session as SessionWithId).sessionId = newSessionId;

        return res.status(200).json({
            message: "Logged in successfully",
            user,
            sessionId: newSessionId,
        });
    });
});