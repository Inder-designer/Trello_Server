import { Types } from "mongoose";
import Activity from "../models/Board/Activity";

interface IArgumentsHelper {
    cardId?: string | Types.ObjectId;
    boardId?: string | Types.ObjectId;
    userId?: string | Types.ObjectId; // who performed the action
    action?: string; // e.g., "moved", "commented", "added label", etc.
    comment?: string;
    addMemberToCard?: {
        userId?: string | Types.ObjectId
    };
    createCard?: {
        listId?: string | Types.ObjectId
    };
    moved?: {
        to?: string,
        from?: string | Types.ObjectId
    }
}

export const logActivityHelper = async ({
    cardId,
    userId,
    boardId,
    action,
    createCard,
    moved,
    comment,
    addMemberToCard
}: IArgumentsHelper) => {
    await Activity.create({
        userId,
        boardId,
        cardId,
        action,
        ...(createCard && { createCard }),
        ...(moved && { moved }), // wrapped in array
        ...(comment && { comment }),
        ...(addMemberToCard && { addMemberToCard })
    });
    return;
};
