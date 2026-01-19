import { Document, Types } from "mongoose";

export interface IInvitation extends Document {
    boardId: Types.ObjectId;
    invitedUser: Types.ObjectId;
    invitedBy: Types.ObjectId;
    status: 'pending' | 'accepted' | 'rejected';
}

export interface IWsInvitation extends Document {
    workspaceId: Types.ObjectId;
    email?: string;
    token: string;
    limit: number;
    used: number;
}