import { RtcTokenBuilder, RtcRole } from "agora-access-token";
import { Request, Response, NextFunction } from 'express';
import { catchAsyncErrors } from "../../middleware/catchAsyncErrors";
import ResponseHandler from "../../Utils/resHandler";
import Meeting from "../../models/Meeting/Meeting";
import { IUser } from "../../types/IUser";
import { generateToken } from "../../Utils/generateAgoraToken";

const APP_ID = process.env.AGORA_APP_ID || "<YOUR_APP_ID>";
const APP_CERT = process.env.AGORA_APP_CERT || "<YOUR_APP_CERT>"; // keep secret

// createMeeting
export const createMeeting = catchAsyncErrors(async (req: Request, res: Response) => {
    const user = req.user as IUser
    const { title, description, scheduledAt, participants } = req.body;

    const channelName = `meeting-${Date.now()}`;

    const meeting = await Meeting.create({
        title,
        description,
        scheduledAt,
        participants,
        createdBy: user._id,
        channelName,
        token: generateToken(channelName)
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

export const getAgoraToken = catchAsyncErrors(async (req: Request, res: Response) => {
    const channelName = req.query.channelName as string;
    console.log(`Generating Agora token for channel: ${channelName}`);

    const uid = req.query.uid ? Number(req.query.uid) : 0; // 0 lets Agora assign
    if (!channelName) return res.status(400).json({ error: "channel required" });

    const role = RtcRole.PUBLISHER;
    const expireSeconds = 60 * 60; // 1 hour
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expireSeconds;

    const token = RtcTokenBuilder.buildTokenWithUid(
        APP_ID,
        APP_CERT,
        channelName,
        uid,
        role,
        privilegeExpiredTs
    );
    return ResponseHandler.send(res, "Agora token generated successfully", { token, channelName, appId: APP_ID, uid });
});
