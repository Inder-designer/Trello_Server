import mongoose, { Schema, model } from 'mongoose';
import { Document, Types } from 'mongoose';

export interface IInvitation extends Document {
    boardId: Types.ObjectId;
    requestBy: Types.ObjectId;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: Date;
}

const InvitationSchema = new Schema<IInvitation>(
    {
        boardId: { type: Schema.Types.ObjectId, ref: 'Board', required: true },
        requestBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    },
    { timestamps: true }
);

export default model<IInvitation>('Invitation', InvitationSchema);
