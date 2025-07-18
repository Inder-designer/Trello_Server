import { getIO } from "../../config/socket";
import { catchAsyncErrors } from "../../middleware/catchAsyncErrors";
import Board from "../../models/Board/Board";
import Card from "../../models/Board/Card";
import List from "../../models/Board/List";
import { IUser } from "../../types/IUser";
import ErrorHandler from "../../Utils/errorhandler";
import ResponseHandler from "../../Utils/resHandler";
import { validateBoardOwnership } from "../../Utils/validateBoardOwnership";

export const createList = catchAsyncErrors(async (req, res, next) => {
    const { title, boardId, order } = req.body;
    const user = req.user as IUser

    if (!title || !boardId) {
        return next(new ErrorHandler("Title and boardId are required", 400));
    }

    await validateBoardOwnership(boardId, user, "Not authorized to create list")

    const list = await List.create({ title, boardId, order: order || 0, cards: [] });

    await Board.findByIdAndUpdate(boardId, {
        $push: { lists: list._id },
    });
    const io = getIO();
    io.to(`board:${list.boardId}`).emit("listCreate", list,)

    return ResponseHandler.send(res, "List created successfully", list, 201);
});

export const updateList = catchAsyncErrors(async (req, res, next) => {
    const user = req.user as IUser
    const { listId } = req.params
    const { title } = req.body;

    const list = await List.findById(listId);
    if (!list) {
        return next(new ErrorHandler("Card not found", 404));
    }
    const boardId = list.boardId
    await validateBoardOwnership(boardId.toString(), user, "Not authorized to update list")

    const updatedList = await List.findByIdAndUpdate(
        listId,
        {
            title
        },
        { new: true, runValidators: true }
    );
    const io = getIO();
    io.to(`board:${list.boardId}`).emit("listUpdate", updatedList,)

    return ResponseHandler.send(res, "List updated successfully", updatedList, 201);
})

export const deleteList = catchAsyncErrors(async (req, res, next) => {
    const user = req.user as IUser
    const { listId } = req.params

    const list = await List.findById(listId);
    if (!list) {
        return next(new ErrorHandler("Card not found", 404));
    }
    const boardId = list.boardId
    await validateBoardOwnership(boardId.toString(), user, "Not authorized to update list")

    const cards = await Card.find({ listId });
    const count = cards.length;

    await List.findByIdAndDelete(listId)
    await Card.deleteMany({ listId })

    await Board.findByIdAndUpdate(boardId, {
        $inc: { cardCounts: -count }
    });
    const io = getIO();
    io.to(`board:${list.boardId}`).emit("listRemove", listId,)

    return ResponseHandler.send(res, "List deleted successfully", 201);
})
