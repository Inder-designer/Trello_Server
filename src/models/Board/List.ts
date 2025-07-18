import mongoose, { Schema, model } from 'mongoose';
import { IList } from '../../types/List';

const ListSchema = new Schema<IList>(
  {
    title: { type: String, required: true },
    boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
    order: { type: Number, default: 0 }, 
  },
  { timestamps: true }
);

export default model<IList>('List', ListSchema);
