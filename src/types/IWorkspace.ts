import { Document, Types } from 'mongoose';

export interface IWorkspaceBoard {
    _id: string;
    title: string;
    members: IWorkspaceMember[]; // Array of workspace members
    owner: string; // Owner ID
}

export interface IWorkspaceMember {
    _id: string;
    fullName: string;
    initials: string;
    userName?: string;
    email: string;
    isOwner: boolean;
    boards: IWorkspaceBoard[];
}

export interface IWorkspace extends Document {
    _id: Types.ObjectId;
    title: string;
    description?: string;
    owner: Types.ObjectId;
    members: Types.ObjectId[];
    boards: Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
    isOwner?: boolean;
}