import { Document, Types } from 'mongoose';

export interface ILabel {
    name: string;
    color: string;
    _id?: Types.ObjectId;
}
export interface IBoard extends Document {
    _id: Types.ObjectId;
    workspace: Types.ObjectId;
    title: string;
    description?: string;
    background?: string;
    owner: Types.ObjectId;
    members: Types.ObjectId[];
    lists: Types.ObjectId[];
    cardCounts: number
    labels: ILabel[];
    createdAt: Date;
    updatedAt: Date;
    inviteToken?: string | null;
    inviteTokenRevokedAt?: Date | null;
    isClosed?: boolean;
}