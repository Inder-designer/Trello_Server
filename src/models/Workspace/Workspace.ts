import mongoose, { Schema, model } from 'mongoose';
import { IWorkspace } from '../../types/IWorkspace';

const WorkspaceSchema = new Schema<IWorkspace>(
    {
        owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        title: { type: String, required: true },
        description: { type: String, default: '' },
        boards: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Board' }],
        members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    },
    {
        timestamps: true,
    }
);

export default model<IWorkspace>('Workspace', WorkspaceSchema);
