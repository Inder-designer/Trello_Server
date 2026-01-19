import Board from "../models/Board/Board";
import Workspace from "../models/Workspace/Workspace";
import { IUser } from "../types/IUser";
import ErrorHandler from "./errorhandler";

export const validateBoardOwnership = async (
    boardId: string,
    user: IUser,
    message?: string
) => {
    const board = await Board.findById(boardId);
    if (!board) {
        throw new ErrorHandler("Board not found", 404);
    }

    if (!board.owner.equals(user._id)) {
        throw new ErrorHandler(message || "Not authorized access this board", 403);
    }

    return board;
};

export const validateBoardMembership = async (
    boardId: string,
    user: IUser,
    message?: string
) => {
    const board = await Board.findById(boardId);
    if (!board) {
        throw new ErrorHandler("Board not found", 404);
    }
    const isMember = board.members.some(memberId => memberId.equals(user._id));
    if (!board.owner.equals(user._id) && !isMember) {
        throw new ErrorHandler(message || "Not authorized access this board", 403);
    }
    return board;
}

export const validateWorkspaceOwnership = async (
    workspaceId: string,
    user: IUser,
    message?: string
) => {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
        throw new ErrorHandler("Workspace not found", 404);
    }

    if (!workspace.owner.equals(user._id)) {
        throw new ErrorHandler(message || "Not authorized access this workspace", 403);
    }

    return workspace;
};
