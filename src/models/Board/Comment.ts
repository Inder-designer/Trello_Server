import { Schema, model, Types } from "mongoose";
import { IComment } from "../../types/Comment";

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
        cardId: { type: Schema.Types.ObjectId, ref: "Card", required: true },
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        message: { type: String, required: true },
        reactions: [ReactionSchema],
    },
    { timestamps: true } 
);

export default model<IComment>("Comment", CommentSchema);