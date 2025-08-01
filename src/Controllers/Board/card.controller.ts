import mongoose, { Types } from "mongoose";
import { catchAsyncErrors } from "../../middleware/catchAsyncErrors";
import Activity from "../../models/Board/Activity";
import Board from "../../models/Board/Board";
import Card from "../../models/Board/Card";
import Comment from "../../models/Board/Comment";
import { IUser } from "../../types/IUser";
import ErrorHandler from "../../Utils/errorhandler";
import ResponseHandler from "../../Utils/resHandler";
import { validateBoardOwnership } from "../../Utils/validateBoardOwnership";
import { logActivityHelper } from "../../Utils/logActivity";
import { getIO } from "../../config/socket";
import { createNotification } from "../../Utils/notification";
import { generateShortLink } from "../../Utils/shortLinkGenerator";

export const createCard = catchAsyncErrors(async (req, res, next) => {
    const user = req.user as IUser
    const { title, description, listId, boardId, dueDate, idMembers, priority, attachments } = req.body;

    if (!title || !listId || !boardId) {
        return next(new ErrorHandler("Title, listId, and boardId are required", 400));
    }

    await validateBoardOwnership(boardId.toString(), user, "Not authorized to create card")

    let card = await Card.create({
        title,
        description,
        listId,
        boardId,
        labels: [],
        idCreator: user._id,
        idMembers: idMembers ?? [],
        attachments: attachments ?? [],
        priority,
        dueDate
    });
    const shortLink = await generateShortLink({ cardId: card._id.toString() });
    card.shortLink = shortLink;
    card = await card.populate("idMembers", "fullName initials");
    const io = getIO();
    io.to(`board:${card.boardId}`).emit(`cardCreate:${card.boardId}`, card)

    for (const memberId of idMembers) {
        if (memberId.toString() !== user._id.toString()) {
            await createNotification({
                type: "card",
                userId: memberId,
                createdBy: user._id,
                data: {
                    cardId: card._id,
                    boardId,
                    action: "addMemberToCard",
                    userIdForAction: memberId,
                },
            });
        }
    }

    return ResponseHandler.send(res, "Card created successfully", card, 201);
});

export const updateCard = catchAsyncErrors(async (req, res, next) => {
    const user = req.user as IUser;
    const { cardId } = req.params;
    const { title, description, boardId, dueDate, labels, attachments, idMembers = [], priority } = req.body;

    await validateBoardOwnership(boardId.toString(), user, "Not authorized to update card");

    // 1. Get the previous version of the card
    const prevCard = await Card.findById(cardId);
    if (!prevCard) {
        return next(new ErrorHandler("Card not found", 404));
    }

    const prevMembers = prevCard.idMembers.map(_id => _id.toString());
    const newMembers = idMembers.map((_id: any) => _id.toString());

    const addedMembers: string[] = newMembers.filter((_id: string) => !prevMembers.includes(_id));
    const removedMembers = prevMembers.filter(_id => !newMembers.includes(_id));

    // 3. Update the card
    const updatedCard = await Card.findByIdAndUpdate(
        cardId,
        {
            title,
            description,
            labels,
            idMembers,
            attachments,
            priority,
            dueDate,
        },
        { new: true, runValidators: true }
    )
        .populate("idMembers", "fullName initials")
        .populate("idCreator", "fullName initials");

    // 4. Emit update event
    if (!updatedCard) {
        return next(new ErrorHandler("Card not found after update", 404));
    }
    const io = getIO();
    io.to(`board:${updatedCard.boardId}`).emit(`cardUpdated:${updatedCard.boardId}`, updatedCard);

    for (const memberId of addedMembers) {
        await createNotification({
            type: "card",
            userId: new Types.ObjectId(memberId),
            createdBy: user._id,
            data: {
                cardId: updatedCard._id,
                boardId: updatedCard.boardId as Types.ObjectId,
                action: "addMemberToCard",
                userIdForAction: new Types.ObjectId(memberId),
            },
        });
    }

    for (const memberId of removedMembers) {
        await createNotification({
            type: "card",
            userId: new Types.ObjectId(memberId),
            createdBy: user._id,
            data: {
                cardId: updatedCard._id,
                boardId: updatedCard.boardId as Types.ObjectId,
                action: "removeMemberFromCard",
                userIdForAction: new Types.ObjectId(memberId),
            },
        });
    }

    return ResponseHandler.send(res, "Card updated successfully", updatedCard, 201);
});

export const moveCard = catchAsyncErrors(async (req, res, next) => {
    const user = req.user as IUser
    const { cardId } = req.params
    const { listId } = req.body;

    const card = await Card.findById(cardId);
    if (!card) {
        return next(new ErrorHandler("Card not found", 404));
    }

    const fromListId = card.listId;

    await Card.findByIdAndUpdate(
        cardId,
        {
            listId
        },
        { new: true, runValidators: true }
    );

    const targetUserIds = (card.idMembers || [])
        .filter((memberId: mongoose.Types.ObjectId) => !memberId.equals(user._id));

    await Promise.all(
        targetUserIds.map((targetUserId: mongoose.Types.ObjectId) =>
            createNotification({
                createdBy: user._id,
                userId: targetUserId,
                type: "card",
                data: {
                    cardId: card._id,
                    boardId: card.boardId,
                    action: "moved",
                    fromListId,
                    toListId: listId,
                },
            })
        )
    );

    const io = getIO();
    io.to(`board:${card.boardId}`).emit(`cardMoved:${card.boardId}`, {
        cardId,
        fromListId,
        toListId: listId,
    })
    const updatedCard = await Card.findById(cardId).populate("idMembers", "fullName initials");

    return ResponseHandler.send(res, "Card update successfully", updatedCard, 201);
});

export const removeCard = catchAsyncErrors(async (req, res, next) => {
    const user = req.user as IUser
    const { cardId } = req.params
    const card = await Card.findById(cardId)

    if (!card) {
        return next(new ErrorHandler("Card not found", 404));
    }
    const boardId = card.boardId
    await validateBoardOwnership(boardId.toString(), user, "Not authorized to create card")

    await Card.findOneAndDelete({ _id: cardId })

    const io = getIO();
    io.to(`board:${card.boardId}`).emit(`cardRemoved:${card.boardId}`, { cardId, listId: card.listId })

    return ResponseHandler.send(res, "Card deleted successfully", 201);
})

export const getCards = catchAsyncErrors(async (req, res, next) => {
    const { boardId } = req.params;
    const user = req.user as IUser

    const board = await Board.findById(boardId);
    if (!board) {
        return next(new ErrorHandler("Board not found", 404));
    }
    if (!board.members.some((memberId: mongoose.Types.ObjectId) => memberId.equals(user?._id))) {
        return next(new ErrorHandler("Not authorized to get this board cards", 403));
    }

    const cards = await Card.find({ boardId })

    return ResponseHandler.send(res, "Cards successfully", cards, 201);
})

// get card by id
export const getCardById = catchAsyncErrors(async (req, res, next) => {
    const { cardId } = req.params;
    const card = await Card.findById(cardId).populate("idMembers", "fullName initials").populate("idCreator", "fullName initials");
    if (!card) {
        return next(new ErrorHandler("Card not found", 404));
    }
    // get card comments
    const comments = await Comment.find({ cardId }).populate("userId", "fullName initials").populate("reactions.userIds", "fullName initials").sort({ createdAt: -1 });

    const cardWithComments = card.toObject();
    cardWithComments.comments = comments;
    return ResponseHandler.send(res, "Card found successfully", cardWithComments, 200);
});

export const addComment = catchAsyncErrors(async (req, res, next) => {
    const { cardId, message } = req.body;
    const user = req.user as IUser;

    if (!cardId || !message) {
        return next(new ErrorHandler("cardId and message are required", 400));
    }
    const card = await Card.findById(cardId);
    if (!card) {
        return next(new ErrorHandler("Card not found", 404));
    }

    let comment = await Comment.create({
        cardId,
        boardId: card.boardId,
        userId: user._id,
        message,
    });
    comment = await comment.populate("userId", "fullName initials");

    const targetUserIds = (card.idMembers || [])
        .filter((memberId: mongoose.Types.ObjectId) => !memberId.equals(user._id));

    await Promise.all(
        targetUserIds.map((targetUserId: mongoose.Types.ObjectId) =>
            createNotification({
                createdBy: user._id,
                userId: targetUserId,
                type: "card",
                data: {
                    cardId: card._id,
                    boardId: card.boardId,
                    action: "commented",
                    commentId: comment._id as Types.ObjectId,
                },
            })
        )
    );

    const io = getIO();
    io.to(`board:${card.boardId}`).emit(`commentAdded:${card.boardId}`, { card, comment });

    return ResponseHandler.send(res, "Comment added", comment, 201);
});

export const deleteComment = catchAsyncErrors(async (req, res, next) => {
    const { commentId } = req.body;
    const user = req.user as IUser;

    const comment = await Comment.findById(commentId).populate("cardId");
    if (!comment) {
        return next(new ErrorHandler("Comment not found", 404));
    }
    if (!comment.userId.equals(user._id)) {
        return next(new ErrorHandler("Not authorized to delete this comment", 403));
    }

    await Comment.findByIdAndDelete(commentId);

    const io = getIO();
    io.to(`board:${comment.boardId}`).emit(`commentDeleted:${comment.boardId}`, comment);

    return ResponseHandler.send(res, "Comment deleted successfully", {}, 200);
});

// Add or remove emoji reaction to a comment (updated for new schema)
export const reactToComment = catchAsyncErrors(
    async (req, res, next) => {
        const { commentId, emoji } = req.body;
        const user = req.user as IUser;

        if (!commentId || !emoji?.unified || !emoji?.emoji) {
            return next(
                new ErrorHandler("commentId and emoji {emoji, unified} are required", 400)
            );
        }

        const comment = await Comment.findById(commentId);

        if (!comment) return next(new ErrorHandler("Comment not found", 404));
        if (!comment.reactions) comment.reactions = [];

        const reactionGroup = comment.reactions.find(
            (r) => r.emoji.unified === emoji.unified
        );

        if (reactionGroup) {
            const alreadyReacted = reactionGroup.userIds.some((id) =>
                id.equals(user._id)
            );

            if (alreadyReacted) {
                reactionGroup.userIds = reactionGroup.userIds.filter(
                    (id) => !id.equals(user._id)
                );
            } else {
                reactionGroup.userIds.push(user._id as Types.ObjectId);
            }

            reactionGroup.count = reactionGroup.userIds.length;

            if (reactionGroup.count === 0) {
                comment.reactions = comment.reactions.filter(
                    (r) => r.emoji.unified !== emoji.unified
                );
            }
        } else {
            comment.reactions.push({
                userIds: [user._id],
                emoji: { emoji: emoji.emoji, unified: emoji.unified },
                count: 1,
            });
        }

        await comment.save();
        await comment.populate('reactions.userIds', 'fullName initials');

        const io = getIO();
        io.to(`board:${comment.boardId}`).emit(`commentReacted:${comment.boardId}`, comment);

        return ResponseHandler.send(res, "Reaction updated", comment, 200);
    }
);

export const logActivity = catchAsyncErrors(async (req, res, next) => {
    const { cardId, boardId, action, message } = req.body;
    const user = req.user as IUser;

    const activity = await Activity.create({
        cardId,
        boardId,
        userId: user._id,
        action,
        message,
    });

    return ResponseHandler.send(res, "Activity logged", activity, 201);
});