import { Request, Response, NextFunction } from 'express';
import { catchAsyncErrors } from "../../middleware/catchAsyncErrors";
import Board from "../../models/Board/Board";
import { IUser } from "../../types/IUser";
import ErrorHandler from '../../Utils/errorhandler';
import { validateBoardOwnership } from '../../Utils/validateBoardOwnership';
import ResponseHandler from '../../Utils/resHandler';
import { generateBoardInviteToken } from '../../Utils/boardInviteToken';
import { Types } from 'mongoose';
import Invitation from '../../models/User/Invitation';
import { getIO } from '../../config/socket';
import User from '../../models/User/User';

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
    io.to(`board:${board._id}`).emit(`joinRequest:${board._id}`, {
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
    const board = await Board.findById(boardId);
    if (!board) return next(new ErrorHandler("Board not found", 404));
    if (board.isClosed) {
        return next(new ErrorHandler("This board is closed", 404));
    }
    // Find the most recent invitation for this user and board
    const latestRequest = await Invitation.findOne({
        boardId,
        requestBy: user._id,
    }).sort({ createdAt: -1 });
    let status: string = "allowed";
    if (latestRequest) status = latestRequest.status !== "pending" ? "allowed" : "REQUEST_ACCESS_MEMBER_LIMIT_EXCEEDED";
    return ResponseHandler.send(res, "Join request status fetched", { status }, 200);
});

// accept/reject join request
export const respondToJoinRequest = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const { requestId } = req.params;
    const { action } = req.body; // "accept" or "reject"
    const user = req.user as IUser;
    const request = await Invitation.findById(requestId).populate("boardId", "owner members title");
    if (!request) return next(new ErrorHandler("Join request not found", 404));
    const requestBy = await User.findById(request.requestBy);
    if (!requestBy) return next(new ErrorHandler("Requesting user not found", 404));
    const board = await Board.findOne({ _id: request.boardId._id });
    if (!board) return next(new ErrorHandler("Board not found", 404));
    validateBoardOwnership(request.boardId._id.toString(), user, "Not authorized to respond to this join request");
    if (request.status !== "pending") {
        return next(new ErrorHandler("Join request is not pending", 400));
    }

    if (action === "accept") {
        board.members.push(request.requestBy);
        requestBy.idBoards.push(board._id);
        request.status = "accepted";

        await board.save();
        await requestBy.save();
    } else if (action === "reject") {
        request.status = "rejected";
    }
    console.log(user);

    await request.save();
    // Emit real-time notification
    const io = getIO();
    io.to(`board:${request.boardId._id}`).emit(`joinRequestResponse:${request.boardId._id}`, {
        requestId,
        status: request.status,
        requestBy: request.requestBy,
    });

    return ResponseHandler.send(res, `Join request ${action}ed successfully`, null, 200);
});