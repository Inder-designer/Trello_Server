import { emitToWorkspace } from "../../Utils/socketEmitter";
import { catchAsyncErrors } from "../../middleware/catchAsyncErrors";
import Board from "../../models/Board/Board";
import Card from "../../models/Board/Card";
import List from "../../models/Board/List";
import { IUser } from "../../types/IUser";
import ErrorHandler from "../../Utils/errorhandler";
import ResponseHandler from "../../Utils/resHandler";
import { validateBoardOwnership } from "../../Utils/validateOwnership";

export const createList = catchAsyncErrors(async (req, res, next) => {
    const { title, boardId, order } = req.body;
    const user = req.user as IUser

    if (!title || !boardId) {
        return next(new ErrorHandler("Title and boardId are required", 400));
    }

    const board = await validateBoardOwnership(boardId, user, "Not authorized to create list")

    const list = await List.create({ title, boardId, order: order || 0, cards: [] });

    await Board.findByIdAndUpdate(boardId, {
        $push: { lists: list._id },
    });
    emitToWorkspace(board.workspace, `listCreate:${boardId}`, list);

    return ResponseHandler.send(res, "List created successfully", list, 201);
});

export const updateList = catchAsyncErrors(async (req, res, next) => {
    const user = req.user as IUser
    const { listId } = req.params
    const { title } = req.body;

    const list = await List.findById(listId);
    if (!list) {
        return next(new ErrorHandler("List not found", 404));
    }
    const boardId = list.boardId
    const board = await validateBoardOwnership(boardId.toString(), user, "Not authorized to update list")

    const updatedList = await List.findByIdAndUpdate(
        listId,
        {
            title
        },
        { new: true, runValidators: true }
    );
    emitToWorkspace(board.workspace, `listUpdate:${list.boardId}`, updatedList);

    return ResponseHandler.send(res, "List updated successfully", updatedList, 201);
})

export const deleteList = catchAsyncErrors(async (req, res, next) => {
    const user = req.user as IUser
    const { listId } = req.params

    const list = await List.findById(listId);
    if (!list) {
        return next(new ErrorHandler("List not found", 404));
    }
    const boardId = list.boardId
    const board = await validateBoardOwnership(boardId.toString(), user, "Not authorized to delete list")

    await List.findByIdAndDelete(listId)
    const result = await Card.deleteMany({ listId })
    const count = result.deletedCount;

    await Board.findByIdAndUpdate(boardId, {
        $pull: { lists: list._id },
        $inc: { cardCounts: -count }
    });
    emitToWorkspace(board.workspace, `listRemove:${list.boardId}`, { listId, cardCounts: count });

    return ResponseHandler.send(res, "List deleted successfully", 201);
})
