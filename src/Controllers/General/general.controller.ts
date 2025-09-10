import { Request, Response, } from 'express';
import { catchAsyncErrors } from "../../middleware/catchAsyncErrors";
import ResponseHandler from "../../Utils/resHandler";
import Meeting from "../../models/Meeting/Meeting";
import { IUser } from "../../types/IUser";
import { generateToken } from "../../Utils/generateAgoraToken";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { generateZegoToken } from '../../Utils/generateZegoToken';

const APP_ID = process.env.ZEGO_APP_ID || "<ZEGO_APP_ID>";
const SERVER_SECRET = process.env.ZEGO_SERVER_SECRET || "<ZEGO_SERVER_SECRET>"; // keep secret

// createMeeting
export const createMeeting = catchAsyncErrors(async (req: Request, res: Response) => {
    const user = req.user as IUser
    const { title, description, scheduledAt, participants } = req.body;
    const scheduledDateUTC = new Date(scheduledAt);
    const channelName = `meeting-${crypto.randomBytes(8).toString("hex")}`;

    const payload = {
        app_id: APP_ID,
        user_id: user._id,
        room_id: channelName,
        exp: Math.floor(scheduledDateUTC.getTime() / 1000) + 60 * 60 * 24,
    };
    console.log(payload);

    const token = generateZegoToken(Number(APP_ID), SERVER_SECRET, channelName, user._id.toString());
    console.log(token);

    const meeting = await Meeting.create({
        title,
        description,
        scheduledAt: scheduledDateUTC.toISOString(),
        participants: Array.isArray(participants) ? [...participants, user._id] : [user._id],
        createdBy: user._id,
        channelName,
        token
    });

    return ResponseHandler.send(res, "Meeting created successfully", meeting);
});

// getMeetings
export const getMeetings = catchAsyncErrors(async (req: Request, res: Response) => {
    const user = req.user as IUser;

    const meetings = await Meeting.find({ participants: user._id })
        .populate("createdBy", "fullName email")
        .populate("participants", "fullName email")
        .sort({ scheduledAt: -1 });

    return ResponseHandler.send(res, "Meetings retrieved successfully", meetings);
});
