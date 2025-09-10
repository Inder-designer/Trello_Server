import { KJUR } from "jsrsasign";

export function generateZegoToken(appId: number, serverSecret: string, roomId: string, userId: string, effectiveTime: number = 3600) {
    const payload = {
        app_id: appId,
        user_id: userId,
        room_id: roomId,
        exp: Math.floor(Date.now() / 1000) + effectiveTime,
    };

    return KJUR.jws.JWS.sign("HS256", { alg: "HS256" }, payload, serverSecret);
}
