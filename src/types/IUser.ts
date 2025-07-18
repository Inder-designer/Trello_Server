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

    comparePassword(password: string): Promise<boolean>;
    generateToken(): string;
    generateResetToken(): string;
}