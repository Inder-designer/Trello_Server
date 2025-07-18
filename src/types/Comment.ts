import { Document, Types } from 'mongoose';

export interface IComment extends Document {
  cardId: Types.ObjectId;
  userId: Types.ObjectId;
  message: string;
  createdAt: Date;
  updatedAt: Date;
  reactions?: {
    userIds: Types.ObjectId[];
    emoji: { emoji: string; unified: string };
    count: number;
  }[];
}
