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
// default create 3 lists when a board is created 
BoardSchema.post('save', async function (doc, next) {
    const ListModel = mongoose.model('List');
    if (doc.lists.length === 0) {
        const todoList = await ListModel.create({ title: 'To Do', board: doc._id, order: 1 });
        const inProgressList = await ListModel.create({ title: 'In Progress', board: doc._id, order: 2 });
        const doneList = await ListModel.create({ title: 'Done', board: doc._id, order: 3 });
        doc.lists.push(todoList._id, inProgressList._id, doneList._id);
        await doc.save();
    }
});

export default model<IBoard>('Board', BoardSchema);
