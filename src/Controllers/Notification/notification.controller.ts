import { Request, Response, NextFunction } from 'express';
import mongoose, { Types } from "mongoose";
import { catchAsyncErrors } from "../../middleware/catchAsyncErrors";
import { IUser } from "../../types/IUser";
import ErrorHandler from "../../Utils/errorhandler";
import ResponseHandler from "../../Utils/resHandler";
import Notification from '../../models/Notification/Notification';

// get all notifications for a user
export const getNotifications = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IUser;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const unRead = req.query.unRead === 'true';

    const filter: any = { userId: user._id };
    if (unRead) {
        filter.read = false;
    }

    // Total count for pagination
    const totalNotifications = await Notification.countDocuments(filter);

    // Fetch paginated notifications
    const notifications = await Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('createdBy', 'fullName initials')
        .populate('userId', 'fullName initials')
        .populate('board.boardId', 'title background')
        .populate('card.boardId', 'title background')
        .populate({
            path: 'card.cardId',
            select: 'title listId shortLink',
            populate: {
                path: 'listId',
                select: 'title'
            }
        })
        .populate('card.comment', 'message createdAt')
        .populate('card.moved.from', 'title')
        .populate('card.moved.to', 'title');

    // Prepare pagination metadata
    const totalPages = Math.ceil(totalNotifications / limit);

    return ResponseHandler.send(res, "Notifications fetched successfully", {
        notifications,
        pagination: {
            total: totalNotifications,
            page,
            limit,
            totalPages,
        }
    }, 200);
});

// mark notification as read
export const markNotificationAsRead = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const { notificationId } = req.body;
    const user = req.user as IUser;

    if (!mongoose.isValidObjectId(notificationId)) {
        return next(new ErrorHandler("Invalid notification ID", 400));
    }

    const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId: user._id },
        { read: true },
        { new: true }
    );

    if (!notification) {
        return next(new ErrorHandler("Notification not found or you do not have permission to access it", 404));
    }

    return ResponseHandler.send(res, "Notification marked as read", notification, 200);
});