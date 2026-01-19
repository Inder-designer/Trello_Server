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
import { validateBoardMembership, validateBoardOwnership } from '../../Utils/validateOwnership';

import { createNotification } from '../../Utils/notification';
import Workspace from '../../models/Workspace/Workspace';
import { removeUserFromBoard } from '../../Utils/removeUserFromBoard';
import { emitToWorkspace } from '../../Utils/socketEmitter';

export const inviteMember = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const { boardId } = req.params;
    const { email } = req.body;
    const user = req.user as IUser;
    const userId = user._id;

    const board = await Board.findById(boardId).populate("members", "email");

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
    const { title, description, background, workspace } = req.body;
    const user = req.user as IUser

    if (!title) {
        return next(new ErrorHandler("Title is required", 400));
    }
    let workspaceId = workspace;
    if (!workspace) {
        // create new workspace if not provided
        const newWorkspace = await Workspace.create({
            title: `${user.fullName} Workspace`,
            description: description || "",
            owner: user._id,
            members: [user._id],
        });
        workspaceId = newWorkspace._id;
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
        workspace: workspaceId,
    });

    // Update user document
    await User.findByIdAndUpdate(user._id, {
        $push: {
            ownedBoards: newBoard._id,
            idBoards: newBoard._id,
        },
    });
    await Workspace.findByIdAndUpdate(workspaceId, {
        $push: {
            boards: newBoard._id,
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

        await Workspace.findByIdAndUpdate(
            board.workspace,
            { $pull: { boards: board._id } },
            { session }
        );

        await List.deleteMany({ boardId: board._id }).session(session);
        await Card.deleteMany({ boardId: board._id }).session(session);

        await board.deleteOne({ session });
        await session.commitTransaction();
        session.endSession();
        return ResponseHandler.send(res, "Board deleted successfully", null, 200);
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        return next(new ErrorHandler((err as Error).message, 500));
    }
});

export const updateBoard = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const { title, description, background, members
    } = req.body;
    const { boardId } = req.params;
    const user = req.user as IUser;

    const board = await validateBoardOwnership(boardId, user, "Not authorized to update this board");
    const updateData: Partial<typeof board> = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (background !== undefined) updateData.background = background;
    if (members !== undefined) updateData.members = members;
    const updatedBoard = await Board.findByIdAndUpdate(
        boardId,
        updateData,
        { new: true, runValidators: true }
    ).populate("lists", "title")
        .populate("members", "initials fullName email");
    let membersToAdd: string[] = [];
    let membersToRemove: string[] = [];

    if (members) {
        const previousMembers = board.members.map(String);
        const newMembers = members.map(String);

        membersToAdd = newMembers.filter(
            (id: string) => !previousMembers.includes(id)
        );

        membersToRemove = previousMembers.filter(
            (id) => !newMembers.includes(id)
        );
        await Promise.all([
            User.updateMany(
                { _id: { $in: membersToAdd } },
                { $addToSet: { idBoards: boardId } }
            ),
            User.updateMany(
                { _id: { $in: membersToRemove } },
                { $pull: { idBoards: boardId } }
            ),
        ]);
        console.log(membersToAdd);
    }


    emitToWorkspace(board.workspace, `boardUpdated:${boardId}`, updatedBoard);
    await Promise.all(
        membersToAdd.map((memberId) =>
            createNotification({
                createdBy: user._id,
                userId: new Types.ObjectId(memberId),
                type: "addedToBoard",
                data: {
                    addedBy: user._id,
                    boardId: board._id,
                    memberAdded: new Types.ObjectId(memberId),
                }
            })
        )
    );

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

    // Fetch workspaces: owned by user
    const myWorkspaces = await Workspace.find({ owner: user._id })
        .populate({
            path: 'boards',
            populate: [
                { path: 'owner', select: 'fullName initials' }
            ]
        })
        .populate('members', 'initials fullName')
        .lean();

    // Fetch workspaces where user is a member but not the owner
    const guestWorkspaces = await Workspace.find({ members: user._id, owner: { $ne: user._id } })
        .populate({
            path: 'boards',
            populate: [
                { path: 'owner', select: 'fullName initials' }
            ]
        })
        .populate('members', 'initials fullName')
        .lean();

    const getOwnerId = (owner: any) => {
        if (!owner) return null;
        if (typeof owner === 'string') return owner;
        if (owner._id) return owner._id.toString();
        return owner.toString();
    };

    const markBoardOwnership = (boards: any[] = [], forceOwned = false) =>
        boards.map(b => ({
            ...b,
            isOwned: forceOwned ? true : (b.owner ? getOwnerId(b.owner) === user._id.toString() : false),
        }));

    const myWorkspacesWithBoards = (myWorkspaces || []).map(ws => ({
        ...ws,
        isOwned: true,
        boards: markBoardOwnership(ws.boards || [], true),
    }));

    const guestWorkspacesWithBoards = (guestWorkspaces || []).map(ws => ({
        ...ws,
        isOwned: getOwnerId(ws.owner) === user._id.toString(),
        boards: markBoardOwnership(
            (ws.boards || []).filter((board: any) =>
                board.members?.some((memberId: any) => memberId.toString() === user._id.toString()) ||
                getOwnerId(board.owner) === user._id.toString()
            ),
            false
        ),
    }));

    return ResponseHandler.send(res, "All Boards", {
        ownedBoards,
        memberBoards,
        workspaces: {
            myWorkspaces: myWorkspacesWithBoards,
            guestWorkspaces: guestWorkspacesWithBoards,
        }
    }, 200);
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
    const board = await validateBoardMembership(boardId, user, "You are not a member of this board");

    await removeUserFromBoard(user._id, board);

    emitToWorkspace(board.workspace, `memberLeft:${board._id}`, {
        memberId: user._id,
        boardId: board._id,
        workspaceId: board.workspace
    });
    return ResponseHandler.send(res, "Left the board successfully", null, 200);
});

export const removeFromBoard = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const { boardId } = req.params;
    const { memberId } = req.body;
    const user = req.user as IUser;

    const board = await validateBoardOwnership(boardId, user, "Not authorized to remove members from this board");

    await removeUserFromBoard(memberId, board);

    emitToWorkspace(board.workspace, `memberRemoved:${board._id}`, {
        memberId: memberId,
        boardId: board._id,
        workspaceId: board.workspace
    });
    return ResponseHandler.send(res, "Member removed from board successfully", null, 200);
});

// close/reopen board
export const toggleBoardClosure = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const { boardId } = req.params;
    const user = req.user as IUser;

    const board = await validateBoardOwnership(boardId, user, "Only board owner can close/reopen the board");

    board.isClosed = !board.isClosed;
    await board.save();

    emitToWorkspace(board.workspace, `boardClosureToggled:${board._id}`, {
        isClosed: board.isClosed,
        boardId: board._id,
        workspaceId: board.workspace
    });
    // Optionally, you can also send a notification to the ALL board members
    const targetUserIds = (board.members || [])
        .filter((memberId: mongoose.Types.ObjectId) => !memberId.equals(board.owner));
    await Promise.all(
        targetUserIds.map((memberId: mongoose.Types.ObjectId) =>
            createNotification({
                createdBy: user._id,
                userId: memberId,
                type: "board",
                data: {
                    boardId: board._id,
                    action: board.isClosed ? 'closeBoard' : 'reopenBoard'
                }
            })
        )
    );

    return ResponseHandler.send(res, `Board ${board.isClosed ? 'closed' : 'reopened'} successfully`, null, 200);
});