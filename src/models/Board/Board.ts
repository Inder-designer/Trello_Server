import mongoose, { Schema, model } from 'mongoose';
import { IBoard } from '../../types/Board';
import Card from './Card';

const LabelSchema = new Schema(
    {
        name: { type: String, required: true },
        color: { type: String, required: true },
    },
    { _id: true }
);

const BoardSchema = new Schema<IBoard>(
    {
        workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
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

BoardSchema.index({ workspace: 1, title: 1 });
BoardSchema.index({ owner: 1 });

export default model<IBoard>('Board', BoardSchema);
