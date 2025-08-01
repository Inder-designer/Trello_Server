import { Schema, model, Document } from 'mongoose';

const NotificationSchema = new Schema(
  {
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['card', 'request', 'joinWithLink'],
      required: true
    },
    request: {
      boardId: { type: Schema.Types.ObjectId, ref: 'Board' },
      requestBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    card: {
      cardId: { type: Schema.Types.ObjectId, ref: 'Card' },
      boardId: { type: Schema.Types.ObjectId, ref: 'Board' },
      action: { type: String, enum: ['commented', 'moved', 'addMemberToCard', 'removeMemberFromCard'] },
      comment: {
        type: Schema.Types.ObjectId,
        ref: 'Comment'
      },
      moved: {
        from: { type: Schema.Types.ObjectId, ref: 'List' },
        to: { type: Schema.Types.ObjectId, ref: 'List' }
      },
      addMemberToCard: {
        userId: { type: Schema.Types.ObjectId, ref: 'User' }
      },
      removeMemberFromCard: {
        userId: { type: Schema.Types.ObjectId, ref: 'User' }
      }
    },
    joinWithLink: {
      boardId: { type: Schema.Types.ObjectId, ref: 'Board' },
      userId: { type: Schema.Types.ObjectId, ref: 'User' }
    },
    read: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Clear irrelevant fields before validation
NotificationSchema.pre('validate', function (next) {
  const doc = this as any;

  if (doc.type === 'request') {
    doc.card = undefined;
    doc.joinWithLink = undefined;
  } else if (doc.type === 'card') {
    doc.request = undefined;
    doc.joinWithLink = undefined;
  } else if (doc.type === 'joinWithLink') {
    doc.card = undefined;
    doc.request = undefined;
  }

  next();
});

export default model('Notification', NotificationSchema);
