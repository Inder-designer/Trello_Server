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
    const notifications = await Notification.find({ userId: user._id })
        .populate('createdBy', 'fullName initials')
        .populate('userId', 'fullName initials')
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
        .populate('card.moved.to', 'title')
        .sort({ createdAt: -1 });

    return ResponseHandler.send(res, "Notifications fetched successfully", notifications, 200);
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