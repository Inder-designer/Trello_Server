import { Document, Types } from 'mongoose';

export interface IAttachment {
  name: string;
  url: string;
  type?: string; // optional: 'image', 'pdf', etc.
  uploadedAt?: Date;
}

export interface ICard extends Document {
  _id: Types.ObjectId;
  shortLink: string;
  title: string;
  description: string;
  priority: string;
  idCreator: Types.ObjectId;
  listId: Types.ObjectId;
  boardId: Types.ObjectId;
  label: Types.ObjectId; // Ref to Board.labels._id
  idMembers: Types.ObjectId[]; // Ref to User
  commentCounts: number;
  comments: {
    cardId: Types.ObjectId;
    userId: Types.ObjectId;
    message: string;
  }[];
  //   activities: IAttachment[];
  dueDate?: Date;
  attachments: IAttachment[];
  createdAt: Date;
  updatedAt: Date;
}
