import mongoose, { Model } from 'mongoose';
import validator from 'validator';
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { IUser } from '../../types/IUser';

export interface IUserModel extends Model<IUser> {
    verifyToken: (token: string) => Promise<IUser | null>;
}

const UserSchema = new mongoose.Schema<IUser>(
    {
        fullName: { type: String, required: true },
        email: {
            type: String,
            required: true,
            unique: true,
            validate: [validator.isEmail, 'Invalid email'],
        },
        password: { type: String, required: true },
        initials: String,
        avatarUrl: String,
        userName: { type: String, unique: true },
        idBoards: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Board' }],
        ownedBoards: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Board' }],
    },
    { timestamps: true }
);

UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

UserSchema.methods.comparePassword = function (password: string) {
    return bcrypt.compare(password, this.password);
};

// jwt authentication
UserSchema.methods.generateToken = function () {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET!, { expiresIn: '10d' });
};

// generateResetToken
UserSchema.methods.generateResetToken = function () {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET!, { expiresIn: '10m' });
};

// verify Token
UserSchema.statics.verifyToken = async function (token: string): Promise<IUser | null> {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
        const user = await this.findById(decoded.id);
        return user || null;
    } catch (err) {
        return null;
    }
};

export default mongoose.model<IUser, IUserModel>("User", UserSchema);