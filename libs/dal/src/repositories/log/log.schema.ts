import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';
import { schemaOptions } from '../schema-default.options';
import { LogEntity } from './log.entity';

const logSchema = new Schema(
  {
    transactionId: {
      type: Schema.Types.String,
      index: true,
    },
    text: Schema.Types.String,
    code: Schema.Types.String,
    raw: Schema.Types.Mixed,
    status: Schema.Types.String,
    createdAt: {
      type: Schema.Types.Date,
      default: Date.now,
      index: true,
    },
    _messageId: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
      index: true,
    },
    _notificationId: {
      type: Schema.Types.ObjectId,
      ref: 'Notification',
      index: true,
    },
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    _environmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
      index: true,
    },
    _subscriberId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscriber',
      index: true,
    },
  },
  schemaOptions
);

logSchema.index({ _environmentId: 1, createdAt: -1 });

interface ILogDocument extends LogEntity, Document {
  _id: never;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Log = mongoose.models.Log || mongoose.model<ILogDocument>('Log', logSchema);
