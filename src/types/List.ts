import { Document, Types } from 'mongoose';

export interface IList extends Document {
  title: string;
  boardId: Types.ObjectId;
  cards: Types.ObjectId[];
  order: number;
  createdAt: Date;
  updatedAt: Date;
}
