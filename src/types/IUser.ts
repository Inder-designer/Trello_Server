import mongoose, { Document } from "mongoose";

export interface IUser extends Document {
    _id: mongoose.Types.ObjectId
    fullName: string;
    email: string;
    password: string;
    initials?: string;
    avatarUrl?: string;
    userName?: string;
    idBoards: mongoose.Types.ObjectId[]; // joined boards
    ownedBoards: mongoose.Types.ObjectId[]; // boards user owns
    
    // Lock Panel PIN
    lockPin?: string; // Hashed PIN
    lockPinEnabled: boolean;
    
    // Two-Factor Authentication
    twoFactorSecret?: string; // Secret key for TOTP
    twoFactorEnabled: boolean;
    
    // Single Session Management
    sessionId?: string; // Current active session ID

    comparePassword(password: string): Promise<boolean>;
    generateToken(): string;
    generateResetToken(): string;
    compareLockPin(pin: string): Promise<boolean>;
}