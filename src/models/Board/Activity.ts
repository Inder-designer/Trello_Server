import mongoose, { Schema, model } from 'mongoose';
import { IActivity } from '../../types/Activity';

const ActivitySchema = new Schema<IActivity>(
    {
        cardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Card', required: true },
        boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        action: {
            type: String,
            enum: ["commented", "moved", "createCard", "addMemberToCard","removeMemberFromCard"]
        },
        addMemberToCard: {
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
        },
        createCard: {
            listId: { type: mongoose.Schema.Types.ObjectId, ref: 'List' }
        },
        moved: {
            from: { type: mongoose.Schema.Types.ObjectId, ref: 'List' },
            to: { type: mongoose.Schema.Types.ObjectId, ref: 'List' }
        },
        comment: { type: String },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

export default model<IActivity>('Activity', ActivitySchema);
