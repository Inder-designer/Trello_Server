import { Schema, model, Document } from 'mongoose';

const MeetingSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    scheduledAt: { type: Date, required: true },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    channelName: { type: String, required: true, unique: true },
    token: { type: String, required: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default model('Meeting', MeetingSchema);
