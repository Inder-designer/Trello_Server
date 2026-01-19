import { Request, Response, NextFunction } from 'express';
import { catchAsyncErrors } from '../../middleware/catchAsyncErrors';
import ErrorHandler from '../../Utils/errorhandler';
import { IUser } from '../../types/IUser';
import ResponseHandler from '../../Utils/resHandler';
import Workspace from '../../models/Workspace/Workspace';
import WsInvitationSchema from '../../models/Workspace/Invitation';
import { IWorkspaceMember } from '../../types/IWorkspace';
import User from '../../models/User/User';
import mongoose from 'mongoose';
import List from '../../models/Board/List';
import Card from '../../models/Board/Card';
import Board from '../../models/Board/Board';
import { validateWorkspaceOwnership } from '../../Utils/validateOwnership';
import { emitToWorkspace } from '../../Utils/socketEmitter';
import { generateWorkspaceInviteToken } from '../../Utils/boardInviteToken';

// Create Workspace
export const createWorkspace = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const { title, description } = req.body;
    const user = req.user as IUser;
    const newWorkspace = await Workspace.create({
        title,
        description,
        owner: user._id,
        members: [user._id],
    });
    return ResponseHandler.send(res, "Workspace Created Successfully", newWorkspace);
});

export const updateWorkspace = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const { workspaceId } = req.params;
    const { title, description } = req.body;
    const user = req.user as IUser;

    const workspace = await validateWorkspaceOwnership(workspaceId, user, "Not authorized to update this workspace");

    workspace.title = title || workspace.title;
    workspace.description = description || workspace.description;
    await workspace.save();

    emitToWorkspace(workspace._id, `workspaceUpdated:${workspace._id}`, workspace);
    return ResponseHandler.send(res, "Workspace Updated Successfully", workspace);
});

// Get Workspace
export const getWorkspace = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const { workspaceId } = req.params;
    const user = req.user as IUser

    const workspace = await Workspace.findById(workspaceId).populate('boards').populate('members', 'initials fullName').lean();

    if (!workspace) {
        return next(new ErrorHandler('Workspace not found', 404));
    }

    if (!workspace.members.some((member) => member._id.toString() === user._id.toString())) {
        return next(new ErrorHandler('You are not a member of this workspace', 403));
    }
    const userBoards = (workspace?.boards || []).filter((board: any) =>
        board.members?.some((member: any) => member._id.toString() === user._id.toString()) ||
        board.owner?.toString() === user._id.toString()
    );

    const privateBoards = (workspace?.boards || []).filter((board: any) =>
        !board.members?.some((member: any) => member._id.toString() === user._id.toString()) &&
        board.owner?.toString() !== user._id.toString()
    );

    const filterdWorkspace = {
        ...workspace,
        privateBoards: privateBoards.length || 0,
        boards: userBoards,
    }

    return ResponseHandler.send(res, "Get Workspace", filterdWorkspace);
});

// getworkspace Memebers 
export const getWorkspaceMembers = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const { workspaceId } = req.params;
    const user = req.user as IUser

    const workspace = await Workspace.findById(workspaceId)
        .populate('members', 'fullName initials userName email isActive last_active')
        .populate('boards')
        .lean();

    if (!workspace) {
        return next(new ErrorHandler('Workspace not found', 404));
    }
    if (!workspace.members.some((member) => member._id.toString() === user._id.toString())) {
        return next(new ErrorHandler('You are not a member of this workspace', 403));
    }

    // set isOwner flag
    const membersWithBoards = workspace.members.map((member: any) => {
        const memberBoardIds = workspace.boards
            .filter((board: any) =>
                board.members?.some(
                    (m: IWorkspaceMember) => m._id.toString() === member._id.toString()
                ) ||
                board.owner?.toString() === member._id.toString()
            )
            .map((board: any) => ({ _id: board._id, title: board.title }));

        return {
            ...member,
            isOwner: workspace.owner._id.toString() === member._id.toString(),
            boards: memberBoardIds, // ✅ array of board IDs
        };
    });

    return ResponseHandler.send(res, "Get Workspace Members", membersWithBoards);
});

// Leave Workspace
export const leaveWorkspace = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const { workspaceId } = req.params;
    const user = req.user as IUser
    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
        return next(new ErrorHandler('Workspace not found', 404));
    }
    if (workspace.owner.toString() === user._id.toString()) {
        return next(new ErrorHandler('Workspace owner cannot leave the workspace. Transfer ownership or delete the workspace.', 403));
    }
    if (!workspace.members.includes(user._id)) {
        return next(new ErrorHandler('You are not a member of this workspace', 403));
    }
    // Remove user from workspace members
    workspace.members = workspace.members.filter(memberId => memberId.toString() !== user._id.toString());
    await workspace.save();
    return ResponseHandler.send(res, "Left Workspace Successfully", null);
});

// remove member from workspace and all its boards
export const removeWorkspaceMember = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const { workspaceId } = req.params;
    const { memberId } = req.body;
    const user = req.user as IUser;
    const workspace = await Workspace.findById(workspaceId).populate('boards');

    if (!workspace) {
        return next(new ErrorHandler('Workspace not found', 404));
    }
    if (workspace.owner.toString() !== user._id.toString()) {
        return next(new ErrorHandler('Only the workspace owner can remove members', 403));
    }
    if (!workspace.members.includes(memberId)) {
        return next(new ErrorHandler('Member not found in this workspace', 404));
    }

    workspace.members = workspace.members.filter(id => id.toString() !== memberId);
    await workspace.save();

    return ResponseHandler.send(res, "Member removed from Workspace successfully", null);
});

// Delete Workspace
export const deleteWorkspace = catchAsyncErrors(async (req, res, next) => {
    const { workspaceId } = req.params;
    const user = req.user as IUser;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const [workspaceAgg] = await Workspace.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(workspaceId) } },
            { $project: { owner: 1, boards: 1 } }
        ]).session(session);

        if (!workspaceAgg) {
            return next(new ErrorHandler('Workspace not found', 404));
        }

        if (workspaceAgg.owner.toString() !== user._id.toString()) {
            return next(
                new ErrorHandler('Only the workspace owner can delete the workspace', 403)
            );
        }

        const boardIds = workspaceAgg.boards || [];

        if (boardIds.length) {
            await User.updateMany(
                { idBoards: { $in: boardIds } },
                [
                    {
                        $set: {
                            idBoards: {
                                $filter: {
                                    input: '$idBoards',
                                    as: 'b',
                                    cond: { $not: { $in: ['$$b', boardIds] } }
                                }
                            },
                            ownedBoards: {
                                $filter: {
                                    input: '$ownedBoards',
                                    as: 'b',
                                    cond: { $not: { $in: ['$$b', boardIds] } }
                                }
                            }
                        }
                    }
                ],
                { session }
            );

            await List.deleteMany(
                { boardId: { $in: boardIds } },
                { session }
            );

            await Card.deleteMany(
                { boardId: { $in: boardIds } },
                { session }
            );

            await Board.deleteMany(
                { _id: { $in: boardIds } },
                { session }
            );
        }

        await Workspace.deleteOne(
            { _id: workspaceId },
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        return ResponseHandler.send(
            res,
            'Workspace deleted successfully',
            { workspaceId }
        );
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return next(error);
    }
});

export const createWorkspaceInvitation = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const { workspaceId } = req.params;
    const user = req.user as IUser;
    const workspace = await validateWorkspaceOwnership(workspaceId, user, "Not authorized to create invitation for this workspace");

    // Check if there's an existing invitation that hasn't reached its limit
    const existingInvitation = await WsInvitationSchema.findOne({
        workspaceId: workspace._id,
        $expr: { $lt: ["$used", "$limit"] }
    });

    if (existingInvitation) {
        return ResponseHandler.send(res, "Workspace Invitation Created Successfully", {
            invitation: existingInvitation.token,
        });
    }

    // Create new invitation if none exists or all are at limit
    const inviteToken = generateWorkspaceInviteToken(workspaceId);
    const invitation = await WsInvitationSchema.create({
        workspaceId: workspace._id,
        token: inviteToken,
    });
    const invitationToken = invitation.token

    return ResponseHandler.send(res, "Workspace Invitation Created Successfully",
        invitationToken
    );
});

export const getWorkspaceInvitations = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const { workspaceId } = req.params;
    const user = req.user as IUser;
    const workspace = await validateWorkspaceOwnership(workspaceId, user, "Not authorized to view invitations for this workspace");
    const invitations = await WsInvitationSchema.findOne({ workspaceId: workspace._id }).lean();
    return ResponseHandler.send(res, "Get Workspace Invitations Successfully", invitations?.token || null);
});

// Delete Workspace Invitation
export const deleteWorkspaceInvitation = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const { workspaceId } = req.params;
    const user = req.user as IUser;
    const workspace = await validateWorkspaceOwnership(workspaceId, user, "Not authorized to delete invitations for this workspace");
    await WsInvitationSchema.deleteOne({ workspaceId: workspace._id });
    return ResponseHandler.send(res, "Workspace Invitation Deleted Successfully", null);
});

export const verifyWorkspaceInvitation = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const { workspaceId, token } = req.params;
    const user = req.user as IUser;
    const invitation = await WsInvitationSchema.findOne({ workspaceId, token })
        .populate({
            path: 'workspaceId',
            select: 'title owner members',
            populate: { path: 'owner', select: 'fullName initials email' }
        });

    if (!invitation) {
        return next(new ErrorHandler('Invalid invitation token', 404));
    }
    const wsMembers = (invitation.workspaceId as any)?.members;
    if (wsMembers?.includes(user._id)) {
        return next(new ErrorHandler('Already Member', 400));
    }

    return ResponseHandler.send(res, "Workspace Invitation Verified Successfully", {
        workspaceId: invitation.workspaceId._id,
        workspaceTitle: (invitation.workspaceId as any)?.title,
        token: invitation.token,
        ownerName: (invitation.workspaceId as any)?.owner?.fullName,

    });
});

// Accept Workspace Invitation
export const acceptWorkspaceInvitation = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const { token } = req.params;
    const user = req.user as IUser;
    const invitation = await WsInvitationSchema.findOne({ token });
    if (!invitation) {
        return next(new ErrorHandler('Invalid invitation token', 404));
    }
    const workspace = await Workspace.findById(invitation.workspaceId);
    if (!workspace) {
        return next(new ErrorHandler('Workspace not found', 404));
    }
    if (workspace.members.includes(user._id)) {
        return next(new ErrorHandler('Already Member', 400));
    }
    workspace.members.push(user._id);
    await workspace.save();
    invitation.used += 1;
    await invitation.save();
    return ResponseHandler.send(res, "Joined Workspace Successfully", workspace);
});