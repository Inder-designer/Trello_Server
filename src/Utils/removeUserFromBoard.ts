import Board from '../models/Board/Board';
import Card from '../models/Board/Card';
import User from '../models/User/User';
import mongoose, { Types } from 'mongoose';
import ErrorHandler from './errorhandler';
import { IBoard } from '../types/Board';

export const removeUserFromBoard = async (userId: Types.ObjectId, board: IBoard): Promise<void> => {
    try {

        if (!board.members.some((mId: mongoose.Types.ObjectId) => mId.equals(userId))) {
            return next(new ErrorHandler("User is not a member of this board", 400));
        }

        // Remove the board from the user's boards
        const memberUser = await User.findById(userId);
        if (memberUser) {
            memberUser.idBoards = memberUser.idBoards.filter((bId: mongoose.Types.ObjectId) => !bId.equals(board._id));
            await memberUser.save();
        }

        // Remove the user from the board's members
        await Board.findByIdAndUpdate(board._id, {
            $pull: { members: userId },
        });

        // Remove the user from all cards in the board
        await Card.updateMany(
            { boardId: board._id },
            { $pull: { idMembers: userId } }
        );

    } catch (error) {
        throw new ErrorHandler((error as Error).message, 500);
    }
};
function next(error: ErrorHandler): void {
    throw error || new Error("Function not implemented.");
}
