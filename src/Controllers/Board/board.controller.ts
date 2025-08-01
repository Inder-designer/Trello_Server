import { Request, Response, NextFunction } from 'express';
import Board from '../../models/Board/Board';
import User from '../../models/User/User';
import { catchAsyncErrors } from '../../middleware/catchAsyncErrors';
import ErrorHandler from '../../Utils/errorhandler';
import { IUser } from '../../types/IUser';
import ResponseHandler from '../../Utils/resHandler';
import mongoose, { Types } from 'mongoose';
import Invitation from '../../models/User/Invitation';
import sendMail from '../../Utils/sendMail';
import { IBoard } from '../../types/Board';
import Card from '../../models/Board/Card';
import List from '../../models/Board/List';
import { validateBoardOwnership } from '../../Utils/validateBoardOwnership';
import { getIO } from '../../config/socket';

export const inviteMember = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const { boardId } = req.params;
    const { email } = req.body;
    const user = req.user as IUser;
    const userId = user._id;

    const board = await Board.findById(boardId).populate("members", "email");
    console.log(board);

    if (!board) return next(new ErrorHandler("Board not found", 404));

    if (!board.owner.equals(userId as mongoose.Types.ObjectId)) {
        return next(new ErrorHandler("Only board owner can invite members", 403));
    }
    const isAlreadyMember = board.members.some(
        (member: Types.ObjectId) => member.equals(userId)
    );
    if (isAlreadyMember) {
        return next(new ErrorHandler("User already a member", 400));
    }

    const existingInvite = await Invitation.findOne({
        boardId,
        invitedUser: email,
        status: "pending",
    });

    if (existingInvite) {
        return next(new ErrorHandler("User already invited", 400));
    }

    const invite = await Invitation.create({
        boardId,
        invitedUser: email,
        invitedBy: userId,
        status: "pending",
    });

    // Send email with frontend accept link
    // await sendMail({
    //     to: email,
    //     subject: `Invitation to join board: ${board.title}`,
    //     html: `
    //   <p>You have been invited to join the board <strong>${board.title}</strong>.</p>
    //   <p><a href="${process.env.FRONTEND_URL}/invites?boardId=${boardId}">Click here to accept the invite</a></p>
    // `,
    // });

    return ResponseHandler.send(res, "Invitation sent via email", {
        invite,
        html: `
      <p>You have been invited to join the board <strong>${board.title}</strong>.</p>
      <p><a href="${process.env.FRONTEND_URL}/invites?boardId=${boardId}">Click here to accept the invite</a></p>
    `
    }, 200);
});

export const acceptInvitation = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const { boardId } = req.params;
    const user = req.user as IUser;
    console.log();

    const invite = await Invitation.findOne({
        boardId,
        invitedUser: user.email,
        status: "pending",
    });

    if (!invite) {
        return next(new ErrorHandler("No valid invitation found", 404));
    }

    const board = await Board.findById(boardId);
    if (!board) return next(new ErrorHandler("Board not found", 404));

    // Update membership
    board.members.push(user._id as mongoose.Types.ObjectId);
    user.idBoards.push(board._id as mongoose.Types.ObjectId);

    await board.save();
    await user.save();

    invite.status = "accepted";
    await invite.save();

    return ResponseHandler.send(res, "Invitation accepted", board, 200);
});

export const createBoard = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const { title, description, background } = req.body;
    const user = req.user as IUser

    if (!title) {
        return next(new ErrorHandler("Title is required", 400));
    }

    // Create board
    const newBoard = await Board.create({
        title,
        description,
        background,
        owner: user._id,
        members: [user._id], // owner is also a member
        lists: [],
        labels: [],
    });

    // Update user document
    await User.findByIdAndUpdate(user._id, {
        $push: {
            ownedBoards: newBoard._id,
            idBoards: newBoard._id,
        },
    });

    return ResponseHandler.send(res, "Board created successfully", newBoard, 201);
});

export const deleteBoard = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IUser;
    const { boardId } = req.params;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const board = await Board.findOne({ _id: boardId, owner: user._id }).session(session);
        if (!board) {
            await session.abortTransaction();
            return next(new ErrorHandler("Board not found or not authorized", 404));
        }

        await User.updateMany(
            { _id: { $in: board.members } },
            { $pull: { idBoards: board._id } },
            { session }
        );

        await User.findByIdAndUpdate(
            user._id,
            { $pull: { ownedBoards: board._id, idBoards: board._id } },
            { session }
        );


        await List.deleteMany({ boardId: board._id }).session(session);
        await Card.deleteMany({ boardId: board._id }).session(session);

        await board.deleteOne({ session });
        console.log("pending:", session);

        await session.commitTransaction();
        session.endSession();
        console.log("end:", session);

        return ResponseHandler.send(res, "Board deleted successfully", null, 200);
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        return next(new ErrorHandler((err as Error).message, 500));
    }
});

export const updateBoard = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const { title, description, background } = req.body;
    const { boardId } = req.params;
    const user = req.user as IUser;

    const board = await Board.findById(boardId);
    if (!board) {
        return next(new ErrorHandler("Board not found", 404));
    }
    validateBoardOwnership(boardId, user, "Not authorized to update this board");

    const updatedBoard = await Board.findByIdAndUpdate(
        boardId,
        {
            title,
            description,
            background,
        },
        { new: true, runValidators: true }
    ).populate("members", "initials fullName").populate("lists", "title");

    const io = getIO();
    io.to(`board:${board._id}`).emit(`boardUpdated:${board._id}`, updatedBoard);

    return ResponseHandler.send(res, "Board updated successfully", updatedBoard, 200);
})

export const getAllBoards = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IUser

    const fullDetails = await User.findById(user._id)
        .populate<{ idBoards: IBoard[] }>("idBoards")
        .populate<{ ownedBoards: IBoard[] }>("ownedBoards");

    const ownedBoards = (fullDetails?.ownedBoards ?? []).map((board: IBoard) => ({
        ...("toObject" in board ? board.toObject() : board),
        isOwned: true,
    }));

    const memberBoards = (fullDetails?.idBoards ?? [])
        .filter((board: IBoard) =>
            !(fullDetails?.ownedBoards ?? []).some((owned: IBoard) =>
                owned._id.equals(board._id)
            )
        )
        .map((board: IBoard) => ({
            ...("toObject" in board ? board.toObject() : board),
            isOwned: false,
        }));

    // const boards = [...ownedBoards, ...memberBoards];
    return ResponseHandler.send(res, "All Boards", { ownedBoards, memberBoards }, 201);
})

export const getBoard = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const { boardId } = req.params;
    const user = req.user as IUser

    const board = await Board.findById(boardId).populate("members", "initials fullName").populate("lists", "title");
    if (!board) {
        return next(new ErrorHandler("Board not found", 404));
    }
    if (!board.members.some((memberId: mongoose.Types.ObjectId) => memberId.equals(user?._id))) {
        return next(new ErrorHandler("You are not a member of this board", 403));
    }

    const cards = await Card.find({ boardId })
        .populate("idMembers", "fullName initials")
        .lean();

    // Group cards by listId
    const cardsByList: Record<string, any[]> = {};
    for (const card of cards) {
        const listId = card.listId.toString();
        if (!cardsByList[listId]) {
            cardsByList[listId] = [];
        }
        cardsByList[listId].push(card);
    }

    // Attach cards to each list in board.lists
    const listsWithCards = (board.lists as any[]).map((list) => ({
        ...list.toObject(),
        cards: cardsByList[list._id.toString()] || [],
    }));

    // activity

    // join request
    const joinRequests = await Invitation.find({
        boardId,
        status: { $eq: "pending" },
    }).populate("requestBy", "fullName initials email");

    // comment
    const boardWithCards = {
        ...board.toObject(),
        lists: listsWithCards,
        joinRequests
    };

    return ResponseHandler.send(res, "Board retrieved successfully", boardWithCards, 201);
})

export const leaveBoard = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const { boardId } = req.params;
    const user = req.user as IUser;

    const board = await Board.findById(boardId);
    if (!board) {
        return next(new ErrorHandler("Board not found", 404));
    }
    if (!board.members.some((memberId: mongoose.Types.ObjectId) => memberId.equals(user._id))) {
        return next(new ErrorHandler("You are not a member of this board", 403));
    }

    board.members = board.members.filter((memberId: mongoose.Types.ObjectId) => !memberId.equals(user._id));
    await board.save();

    user.idBoards = user.idBoards.filter((bId: mongoose.Types.ObjectId) => !bId.equals(board._id));
    await user.save();

    await Card.updateMany({ boardId }, { $pull: { idMembers: user._id } });

    const io = getIO();
    io.to(`board:${board._id}`).emit(`memberLeft:${board._id}`, {
        memberId: user._id,
        boardId: board._id
    });
    return ResponseHandler.send(res, "Left the board successfully", null, 200);
});

// close/reopen board
export const toggleBoardClosure = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const { boardId } = req.params;
    const user = req.user as IUser;

    const board = await Board.findById(boardId);
    if (!board) {
        return next(new ErrorHandler("Board not found", 404));
    }
    if (!board.owner.equals(user._id as mongoose.Types.ObjectId)) {
        return next(new ErrorHandler("Only board owner can close/reopen the board", 403));
    }

    board.isClosed = !board.isClosed;
    await board.save();

    const io = getIO();
    io.to(`board:${board._id}`).emit(`boardClosureToggled:${board._id}`, {
        isClosed: board.isClosed,
        boardId: board._id
    });

    return ResponseHandler.send(res, `Board ${board.isClosed ? 'closed' : 'reopened'} successfully`, null, 200);
});