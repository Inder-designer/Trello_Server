import { RtcTokenBuilder, RtcRole } from "agora-access-token";
import { Request, Response, NextFunction } from 'express';
import { catchAsyncErrors } from "../../middleware/catchAsyncErrors";
import ResponseHandler from "../../Utils/resHandler";

const APP_ID = process.env.AGORA_APP_ID || "<YOUR_APP_ID>";
const APP_CERT = process.env.AGORA_APP_CERT || "<YOUR_APP_CERT>"; // keep secret

// Example endpoint: GET /token?channel=room1&uid=1234
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
