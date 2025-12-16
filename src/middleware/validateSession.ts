import { Request, Response, NextFunction } from 'express';
import { Session } from 'express-session';
import { IUser } from '../types/IUser';
import User from '../models/User/User';

interface SessionWithId extends Session {
    sessionId?: string;
}

export const validateSession = async (req: Request, res: Response, next: NextFunction) => {
    // Skip validation for login, logout, and public routes
    if (!req.isAuthenticated() || !req.user) {
        return next();
    }

    try {
        const currentUser = req.user as IUser;
        const sessionId = (req.session as SessionWithId).sessionId;

        // Fetch the latest user data from database
        const dbUser = await User.findById(currentUser._id);

        if (!dbUser) {
            // User doesn't exist anymore
            req.logout((err) => {
                if (err) return next(err);
                req.session.destroy(() => { });
                return res.status(401).json({
                    message: 'Session invalid. User not found.',
                    forceLogout: true,
                });
            });
            return;
        }

        // Check if session IDs match
        if (dbUser.sessionId && sessionId !== dbUser.sessionId) {
            // Session mismatch - user logged in from another device
            req.logout((err) => {
                if (err) return next(err);
                req.session.destroy(() => { });
                return res.status(401).json({
                    message: 'You have been logged out because you logged in from another device.',
                    forceLogout: true,
                });
            });
            return;
        }

        next();
    } catch (error) {
        console.error('Session validation error:', error);
        next(error);
    }
};
