import { RtcTokenBuilder, RtcRole } from "agora-access-token";

const APP_ID = process.env.AGORA_APP_ID || "<YOUR_APP_ID>";
const APP_CERT = process.env.AGORA_APP_CERT || "<YOUR_APP_CERT>";

export function generateToken(channelName: string, scheduledDateUTC: Date, uid: number = 0): string {
    const role = RtcRole.PUBLISHER; // or SUBSCRIBER
    const expireSeconds = Math.floor((scheduledDateUTC.getTime() - Date.now()) / 1000) + 86400; // 86400 seconds = 1 day
    console.log(expireSeconds);

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expireSeconds;

    return RtcTokenBuilder.buildTokenWithUid(
        APP_ID,
        APP_CERT,
        channelName,
        uid,
        role,
        privilegeExpiredTs
    );
}
