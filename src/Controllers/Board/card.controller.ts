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
import { ICard } from "../../types/Card";
import { getIO } from "../../config/socket";

export const createCard = catchAsyncErrors(async (req, res, next) => {
    const user = req.user as IUser
    const { title, description, listId, boardId, dueDate, idMembers, priority } = req.body;

    if (!title || !listId || !boardId) {
        return next(new ErrorHandler("Title, listId, and boardId are required", 400));
    }

    await validateBoardOwnership(boardId.toString(), user, "Not authorized to create card")

    const card = await Card.create({
        title,
        description,
        listId,
        boardId,
        labels: [],
        idCreator: user._id,
        idMembers: idMembers ?? [],
        attachments: [],
        priority,
        dueDate
    });

    await logActivityHelper({
        userId: user._id.toString(),
        boardId,
        cardId: card._id,
        action: "createCard",
        createCard: { listId },
    });

    const io = getIO();
    io.to(`board:${card.boardId}`).emit("cardCreate", card,)

    return ResponseHandler.send(res, "Card created successfully", card, 201);
});

export const updateCard = catchAsyncErrors(async (req, res, next) => {
    const user = req.user as IUser
    const { cardId } = req.params
    const { title, description, boardId, dueDate, labels, attachments, idMembers, priority } = req.body;

    await validateBoardOwnership(boardId.toString(), user, "Not authorized to create card")

    const updatedCard = await Card.findByIdAndUpdate(
        cardId,
        {
            title,
            description,
            labels,
            idMembers: idMembers ?? [],
            attachments,
            priority,
            dueDate,
        },
        { new: true, runValidators: true }
    ).populate("idMembers", "fullName initials");
    if (!updatedCard) {
        return next(new ErrorHandler("Card not found", 404));
    }
    console.log(updatedCard);

    const io = getIO();
    io.to(`board:${updatedCard?.boardId}`).emit("cardUpdated", updatedCard)

    return ResponseHandler.send(res, "Card update successfully", updatedCard, 201);
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

    const io = getIO();
    io.to(`board:${card.boardId}`).emit("cardMoved", {
        cardId,
        fromListId,
        toListId: listId,
    })
    await logActivityHelper({
        cardId,
        userId: user._id,
        boardId: card.boardId,
        action: "moved",
        moved: {
            from: fromListId,
            to: listId,
        },
    });
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
    io.to(`board:${card.boardId}`).emit("cardRemoved", { cardId, listId: card.listId })

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

    const comment = await Comment.create({
        cardId,
        userId: user._id,
        message,
    });

    await Card.findByIdAndUpdate(cardId, {
        $push: { comments: comment._id },
    });

    return ResponseHandler.send(res, "Comment added", comment, 201);
});

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

        const comment = await Comment.findById(commentId)
            .populate('reactions.userIds', 'fullName');

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

        return ResponseHandler.send(res, "Reaction updated", comment, 200);
    }
);