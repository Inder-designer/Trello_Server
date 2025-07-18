import Board from "../models/Board/Board";
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
