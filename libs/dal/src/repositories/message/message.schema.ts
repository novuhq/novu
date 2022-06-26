import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';
import { schemaOptions } from '../schema-default.options';
import { MessageEntity } from './message.entity';

const messageSchema = new Schema(
  {
    _templateId: {
      type: Schema.Types.ObjectId,
      ref: 'NotificationTemplate',
      index: true,
    },
    _environmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
      index: true,
    },
    _messageTemplateId: {
      type: Schema.Types.ObjectId,
    },
    _notificationId: {
      type: Schema.Types.ObjectId,
      ref: 'Notification',
      index: true,
    },
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    _subscriberId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscriber',
      index: true,
    },
    email: Schema.Types.String,
    cta: {
      type: {
        type: Schema.Types.String,
      },
      data: Schema.Types.Mixed,
    },
    channel: Schema.Types.String,
    content: Schema.Types.Mixed,
    phone: Schema.Types.String,
    seen: {
      type: Schema.Types.Boolean,
      default: false,
    },
    lastSeenDate: Schema.Types.Date,
    createdAt: {
      type: Schema.Types.Date,
      default: Date.now,
    },
    status: {
      type: Schema.Types.String,
      default: 'sent',
    },
    errorId: Schema.Types.String,
    errorText: Schema.Types.String,
    providerResponse: Schema.Types.Mixed,
    transactionId: {
      type: Schema.Types.String,
      index: true,
    },
    triggerPayload: Schema.Types.Mixed,
  },
  { ...schemaOptions }
);

messageSchema.virtual('subscriber', {
  ref: 'Subscriber',
  localField: '_subscriberId',
  foreignField: '_id',
  justOne: true,
});

messageSchema.virtual('template', {
  ref: 'NotificationTemplate',
  localField: '_templateId',
  foreignField: '_id',
  justOne: true,
});

interface IMessageDocument extends MessageEntity, Document {
  _id: never;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Message = mongoose.models.Message || mongoose.model<IMessageDocument>('Message', messageSchema);
