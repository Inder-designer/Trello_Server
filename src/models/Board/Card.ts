import mongoose, { CallbackWithoutResultAndOptionalError, Schema, model } from 'mongoose';
import { ICard } from '../../types/Card';
import Board from './Board';
import ErrorHandler from '../../Utils/errorhandler';

const AttachmentSchema = new Schema(
    {
        name: { type: String, required: true },
        url: { type: String, required: true },
        type: { type: String },
    },
    { timestamps: true }
);
const CardSchema = new Schema<ICard>(
    {
        title: { type: String, required: true },
        description: { type: String, default: '' },
        priority: String,
        dueDate: { type: Date },
        idMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        label: { type: mongoose.Schema.Types.ObjectId },
        listId: { type: mongoose.Schema.Types.ObjectId, ref: 'List', required: true },
        boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
        idCreator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        attachments: [AttachmentSchema],
        // comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
        // activities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Activity' }],
    },
    { timestamps: true }
);

CardSchema.pre('save', async function (this: ICard, next: CallbackWithoutResultAndOptionalError) {
    try {
        const board = await Board.findByIdAndUpdate(
            this.boardId,
            { $inc: { cardCounts: 1 } }
        );
        if (!board) {
            return next(new ErrorHandler("Board not found when creating card", 404));
        }
        next();
    } catch (err) {
        return next(new ErrorHandler((err as Error).message, 400));
    }
});

CardSchema.post('findOneAndDelete', async function (
    doc,
    next: CallbackWithoutResultAndOptionalError
) {
    console.log(doc);

    if (doc) {
        try {
            await Board.findByIdAndUpdate(
                doc.boardId,
                { $inc: { cardCounts: -1 } }
            );
        } catch (err) {
            return next(new ErrorHandler((err as Error).message, 400));
        }
    }
    next();
});

export default model<ICard>('Card', CardSchema);
