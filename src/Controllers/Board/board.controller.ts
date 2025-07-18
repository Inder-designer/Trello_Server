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
import { generateBoardInviteToken, verifyBoardInviteToken } from '../../Utils/boardInviteToken';
import { validateBoardOwnership } from '../../Utils/validateBoardOwnership';
import { getIO } from '../../config/socket';
import { stat } from 'fs/promises';

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
    if (!board.owner.equals(user._id)) {
        return next(new ErrorHandler("Not authorized to update this board", 403));
    }

    const updatedBoard = await Board.findByIdAndUpdate(
        boardId,
        {
            title,
            description,
            background,
        },
    );

    return ResponseHandler.send(res, "Board created successfully", updatedBoard, 201);
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

    return ResponseHandler.send(res, "Board created successfully", boardWithCards, 201);
})

// Generate invite token for a board (owner only)
export const generateInviteToken = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const { boardId } = req.params;
    const user = req.user as IUser;
    const board = await Board.findById(boardId);
    if (!board) return next(new ErrorHandler("Board not found", 404));
    await validateBoardOwnership(boardId, user, "Only board owner can generate invite token");
    if (board.inviteToken && board.inviteTokenRevokedAt === null) {
        return ResponseHandler.send(res, "Invite token already exists", { token: board.inviteToken }, 200);
    }
    // Use new format: <shortToken>-<slug>
    const token = generateBoardInviteToken(boardId, board.inviteTokenRevokedAt || null, board.title);
    board.inviteToken = token;
    board.inviteTokenRevokedAt = null;
    await board.save();
    return ResponseHandler.send(res, "Invite token generated", { token }, 200);
});

// Join board with invite token
export const joinBoardWithToken = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const { token } = req.body;
    const user = req.user as IUser;
    // Find the board by inviteToken
    const board = await Board.findOne({ inviteToken: token });
    if (!board) return next(new ErrorHandler("Invalid or expired invite token", 400));
    if (board.inviteTokenRevokedAt) {
        return next(new ErrorHandler("This invite token has been revoked", 400));
    }
    if (board.members.some((memberId: Types.ObjectId) => memberId.equals(user._id))) {
        return next(new ErrorHandler("Already a member of this board", 400));
    }
    board.members.push(user._id);
    user.idBoards.push(board._id);
    await board.save();
    await user.save();
    return ResponseHandler.send(res, "Joined board successfully", board, 200);
});

export const deleteInviteToken = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const { boardId } = req.params;
    const user = req.user as IUser;
    const board = await Board.findById(boardId);
    if (!board) return next(new ErrorHandler("Board not found", 404));
    await validateBoardOwnership(boardId, user, "Only board owner can delete invite token");
    board.inviteTokenRevokedAt = new Date();
    board.inviteToken = null;
    await board.save();
    return ResponseHandler.send(res, "Invite token revoked/deleted", null, 200);
});

export const verifyInviteToken = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    console.log(req.body);

    const { token } = req.body;
    const user = req.user as IUser;
    // Find the board by inviteToken
    const board = await Board.findOne({ inviteToken: token }).populate("owner", "fullName");
    if (!board) return next(new ErrorHandler("Invalid or expired invite token", 400));
    if (board.inviteTokenRevokedAt) {
        return next(new ErrorHandler("This invite token has been revoked", 400));
    }
    const isMember = board.members.some((memberId: Types.ObjectId) => memberId.equals(user._id));
    return ResponseHandler.send(res, "Invite token is valid", {
        valid: true,
        boardId: board._id,
        owner: board.owner,
        boardTitle: board.title,
        inviteToken: board.inviteToken,
        isMember,
    }, 200);
});

export const requestToJoinBoard = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const { boardId } = req.body;
    const user = req.user as IUser;

    const board = await Board.findById(boardId).populate("owner", "_id name email");
    if (!board) return next(new ErrorHandler("Board not found", 404));

    if (board.members.includes(user._id)) {
        return next(new ErrorHandler("Already a member", 400));
    }
    // Check for existing pending/rejected join request
    const existingRequest = await Invitation.findOne({
        boardId,
        requestBy: user._id,
        status: { $in: ["pending"] },
    });
    if (existingRequest) {
        return next(new ErrorHandler("You already have a pending join request for this board", 400));
    }
    // Allow new request if previous was rejected or no request exists
    const newRequest = await Invitation.create({
        boardId,
        requestBy: user._id,
        status: "pending",
    });
    // Emit real-time notification to the board owner
    const io = getIO();
    io.to(`board:${board._id}:owner`).emit("joinRequest", {
        _id: newRequest._id,
        boardId: board._id,
        boardTitle: board.title,
        requestBy: {
            _id: user._id,
            fullName: user.fullName,
            initials: user.initials,
            status: "pending",
        },
        createdAt: newRequest.createdAt,
    });
    return ResponseHandler.send(res, "Join request sent successfully", null, 200);
});

export const checkJoinRequestStatus = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const { boardId } = req.params;
    const user = req.user as IUser;
    if (!boardId) return next(new ErrorHandler("Board ID is required", 400));
    // Find the most recent invitation for this user and board
    const latestRequest = await Invitation.findOne({
        boardId,
        requestBy: user._id,
    }).sort({ createdAt: -1 });
    let status: string = "allowed";
    if (latestRequest) status = latestRequest.status === "rejected" ? "allowed" : "REQUEST_ACCESS_MEMBER_LIMIT_EXCEEDED";
    return ResponseHandler.send(res, "Join request status fetched", { status }, 200);
});
