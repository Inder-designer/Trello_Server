import { Document, ObjectId, Types } from 'mongoose';

export interface IActivity extends Document {
  cardId?: Types.ObjectId;
  boardId?: Types.ObjectId;
  userId?: Types.ObjectId; // who performed the action
  action?: string; // e.g., "moved", "commented", "added label", etc.
  comment?: string;
  addMemberToCard?: {
    userId?: Types.ObjectId
  };
  createCard?: {
    listId?: Types.ObjectId
  };
  moved?: {
    to?: Types.ObjectId,
    from?: Types.ObjectId
  }
}