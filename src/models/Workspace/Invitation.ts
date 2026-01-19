import mongoose, { Schema, model } from 'mongoose';
import { IWsInvitation } from '../../types/IInvitation';

const WsInvitationSchema = new Schema<IWsInvitation>(
    {
        workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
        email: { type: String },
        token: { type: String, required: true },
        limit: { type: Number, default: 10 },
        used: { type: Number, default: 0 }
    },
    {
        timestamps: true,
    }
);

WsInvitationSchema.index({ limit: 1, used: 1 }, { expireAfterSeconds: 0 });

export default model<IWsInvitation>('WsInvitation', WsInvitationSchema);