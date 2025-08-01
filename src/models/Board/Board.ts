import mongoose, { Schema, model } from 'mongoose';
import { IBoard } from '../../types/Board';

const LabelSchema = new Schema(
    {
        name: { type: String, required: true },
        color: { type: String, required: true },
    },
    { _id: true }
);

const BoardSchema = new Schema<IBoard>(
    {
        title: { type: String, required: true },
        description: { type: String, default: '' },
        background: { type: String, default: '#ffffff' }, // or background image URL
        owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        lists: [{ type: mongoose.Schema.Types.ObjectId, ref: 'List' }],
        cardCounts: { type: Number, default: 0 },
        labels: [LabelSchema],
        inviteTokenRevokedAt: { type: Date, default: null },
        inviteToken: { type: String, default: null },
        isClosed: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    }
);

export default model<IBoard>('Board', BoardSchema);
