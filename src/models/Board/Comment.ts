import { Schema, model, Types } from "mongoose";
import { IComment } from "../../types/Comment";
import Card from "./Card";
import ErrorHandler from "../../Utils/errorhandler";

const ReactionSchema = new Schema(
    {
        userIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
        emoji: {
            emoji: String,
            unified: String,
        },
        count: { type: Number, default: 0 },
    },
    { _id: false }
);

const CommentSchema = new Schema<IComment>(
    {
        boardId: { type: Schema.Types.ObjectId, ref: "Board", required: true },
        cardId: { type: Schema.Types.ObjectId, ref: "Card", required: true },
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        message: { type: String, required: true },
        reactions: [ReactionSchema],
    },
    { timestamps: true }
);

CommentSchema.pre("save", async function (this: IComment, next) {
    if (!this.isNew) return next()
    try {
        const card = await Card.findByIdAndUpdate(
            this.cardId,
            { $inc: { commentCounts: 1 } },
            { new: true }
        );
        if (!card) {
            return next(new ErrorHandler("Card not found when adding comment", 404));
        }
        next();
    } catch (err) {
        return next(new ErrorHandler((err as Error).message, 400));
    }
});

CommentSchema.post("findOneAndDelete", async function (
    doc,
    next
) {
    if (doc) {
        try {
            await Card.findByIdAndUpdate(
                doc.cardId,
                { $inc: { commentCounts: -1 } }
            );
        } catch (err) {
            return next(new ErrorHandler((err as Error).message, 400));
        }
    }
    next();
});

export default model<IComment>("Comment", CommentSchema);