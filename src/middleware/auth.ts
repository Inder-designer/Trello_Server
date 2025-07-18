import { Request, Response, NextFunction } from "express";

export const isAuthenticated = (req: Request, res: Response, next: NextFunction): void => {
    if (req.isAuthenticated && req.isAuthenticated()) {
        return next();
    }

    res.status(401).json({ success: false, message: "Unauthorized" });
};

export const authorizeRoles = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = req.user as any;

        if (!roles.includes(user?.role)) {
            return res.status(403).json({
                success: false,
                message: `Role (${user?.role}) is not authorized to access this resource`,
            });
        }

        next();
    };
};