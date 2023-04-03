import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';
import * as mongooseDelete from 'mongoose-delete';
import { ActorTypeEnum } from '@novu/shared';

import { schemaOptions } from '../schema-default.options';
import { MessageDBModel } from './message.entity';

const messageSchema = new Schema<MessageDBModel>(
  {
    _templateId: {
      type: Schema.Types.ObjectId,
      ref: 'NotificationTemplate',
    },
    _environmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
    },
    _messageTemplateId: {
      type: Schema.Types.ObjectId,
    },
    _notificationId: {
      type: Schema.Types.ObjectId,
      ref: 'Notification',
    },
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    _subscriberId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscriber',
    },
    _jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
    },
    templateIdentifier: Schema.Types.String,
    email: Schema.Types.String,
    subject: Schema.Types.String,
    cta: {
      type: {
        type: Schema.Types.String,
      },
      data: Schema.Types.Mixed,
      action: {
        status: Schema.Types.String,
        buttons: [
          {
            type: {
              type: Schema.Types.String,
            },
            content: Schema.Types.String,
            resultContent: Schema.Types.String,
          },
        ],
        result: {
          payload: Schema.Types.Mixed,
          type: {
            type: Schema.Types.String,
          },
        },
      },
    },
    _feedId: {
      type: Schema.Types.ObjectId,
      ref: 'Feed',
    },
    channel: Schema.Types.String,
    content: Schema.Types.Mixed,
    phone: Schema.Types.String,
    directWebhookUrl: Schema.Types.String,
    providerId: Schema.Types.String,
    deviceTokens: [Schema.Types.Array],
    title: Schema.Types.String,
    seen: {
      type: Schema.Types.Boolean,
      default: false,
    },
    read: {
      type: Schema.Types.Boolean,
      default: false,
    },
    lastSeenDate: Schema.Types.Date,
    lastReadDate: Schema.Types.Date,
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
    },
    identifier: Schema.Types.String,
    payload: Schema.Types.Mixed,
    overrides: Schema.Types.Mixed,
    actor: {
      type: {
        type: Schema.Types.String,
        enum: ActorTypeEnum,
      },
      data: Schema.Types.Mixed,
    },
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

messageSchema.plugin(mongooseDelete, { deletedAt: true, deletedBy: true, overrideMethods: 'all' });

/*
 * This index was initially created to optimize:
 * in app widget - feed query
 */
messageSchema.index({
  _subscriberId: 1,
  _environmentId: 1,
  seen: 1,
  read: 1,
  createdAt: -1,
});

/*
 * This index was initially created to optimize:
 * message-matcher in the trigger flow
 * send message in app in the trigger flow
 * inbound parse query
 */
messageSchema.index({
  transactionId: 1,
  _subscriberId: 1,
  _environmentId: 1,
  _messageTemplateId: 1,
  _templateId: 1,
  providerId: 1,
  channel: 1,
});

/*
 * This index was initially created to optimize:
 * webhook app query
 */
messageSchema.index({
  identifier: 1,
  _environmentId: 1,
  _organizationId: 1,
});

/*
 * This index was initially created to optimize:
 * get messages usecase
 */
messageSchema.index({
  _subscriberId: 1,
  _environmentId: 1,
  channel: 1,
});

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Message =
  (mongoose.models.Message as mongoose.Model<MessageDBModel>) ||
  mongoose.model<MessageDBModel>('Message', messageSchema);
