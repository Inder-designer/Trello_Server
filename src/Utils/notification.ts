import { Types } from "mongoose";
import Notification from "../models/Notification/Notification";
import { getIO } from "../config/socket";

type NotificationType = "card" | "request" | "joinWithLink" | "board" | "addedToBoard";

interface BaseNotificationOptions {
    type: NotificationType;
    userId: Types.ObjectId; // target user (who should receive this)
    createdBy?: Types.ObjectId;
}

interface CardNotificationOptions extends BaseNotificationOptions {
    type: "card";
    data: {
        cardId: Types.ObjectId;
        boardId: Types.ObjectId;
        action: "commented" | "moved" | "addMemberToCard" | "removeMemberFromCard";
        commentId?: Types.ObjectId;
        fromListId?: Types.ObjectId;
        toListId?: Types.ObjectId;
        userIdForAction?: Types.ObjectId;
    };
}

interface RequestNotificationOptions extends BaseNotificationOptions {
    type: "request";
    data: {
        boardId: Types.ObjectId;
        requestBy: Types.ObjectId;
    };
}

interface JoinWithLinkNotificationOptions extends BaseNotificationOptions {
    type: "joinWithLink";
    data: {
        boardId: Types.ObjectId;
        userId: Types.ObjectId;
    };
}
interface BoardNotificationOptions extends BaseNotificationOptions {
    type: "board";
    data: {
        boardId: Types.ObjectId;
        action: "closeBoard" | "reopenBoard";
    };
}
interface AddedToBoardNotificationOptions extends BaseNotificationOptions {
    type: "addedToBoard";
    data: {
        boardId: Types.ObjectId;
        addedBy: Types.ObjectId;
        memberAdded: Types.ObjectId;
    };
}

type CreateNotificationInput =
    | CardNotificationOptions
    | RequestNotificationOptions
    | JoinWithLinkNotificationOptions
    | BoardNotificationOptions
    | AddedToBoardNotificationOptions;

export const createNotification = async (options: CreateNotificationInput) => {
    const { userId, type, createdBy } = options;
    const payload: any = {
        userId,
        type,
        createdBy: createdBy || userId,
    };
    console.log(type);


    if (type === "card") {
        const { cardId, boardId, action, commentId, fromListId, toListId, userIdForAction } = options.data;
        payload.card = {
            cardId,
            boardId,
            action,
        };

        if (action === "commented" && commentId) {
            payload.card.comment = commentId;
        }

        if (action === "moved" && fromListId && toListId) {
            payload.card.moved = {
                from: fromListId,
                to: toListId,
            };
        }

        if ((action === "addMemberToCard" || action === "removeMemberFromCard") && userIdForAction) {
            const key = action === "addMemberToCard" ? "addMemberToCard" : "removeMemberFromCard";
            payload.card[key] = {
                userId: userIdForAction,
            };
        }
    }

    if (type === "request") {
        const { boardId, requestBy } = options.data;
        payload.request = {
            boardId,
            requestBy,
        };
    }

    if (type === "joinWithLink") {
        const { boardId, userId: joiningUser } = options.data;
        payload.joinWithLink = {
            boardId,
            userId: joiningUser,
        };
    }
    if (type === "board") {
        const { boardId, action } = options.data;
        payload.board = {
            boardId,
            action,
        };
    }
    if (type === "addedToBoard") {
        const { boardId, addedBy, memberAdded } = options.data;
        payload.addedToBoard = {
            boardId,
            addedBy,
            memberAdded,
        };
    }

    const notificationDoc = await Notification.create(payload);
    const notification = await Notification.findById(notificationDoc._id)
        .populate('createdBy', 'fullName initials')
        .populate('userId', 'fullName initials')
        .populate('board.boardId', 'title background')
        .populate('card.boardId', 'title background')
        .populate({
            path: 'card.cardId',
            select: 'title listId shortLink',
            populate: {
                path: 'listId',
                select: 'title'
            }
        })
        .populate('card.comment', 'message createdAt')
        .populate('card.moved.from', 'title')
        .populate('card.moved.to', 'title')
        .populate('addedToBoard.boardId', 'title background')
        .populate('addedToBoard.addedBy', 'fullName initials')
        .populate('addedToBoard.memberAdded', 'fullName initials')
        .lean();

    // Emit to user's personal room
    const io = getIO();
    io.to(`user:${options.userId}`).emit("notification:receive", notification);
};
