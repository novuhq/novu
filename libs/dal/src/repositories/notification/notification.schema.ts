import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';

import { schemaOptions } from '../schema-default.options';
import { NotificationDBModel } from './notification.entity';

const notificationSchema = new Schema<NotificationDBModel>(
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
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    _subscriberId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscriber',
      index: true,
    },
    transactionId: {
      type: Schema.Types.String,
      index: true,
    },
    channels: [
      {
        type: Schema.Types.String,
      },
    ],
    _digestedNotificationId: {
      type: Schema.Types.String,
    },
    to: {
      type: Schema.Types.Mixed,
    },
    payload: {
      type: Schema.Types.Mixed,
    },
  },
  schemaOptions
);

notificationSchema.virtual('environment', {
  ref: 'Environment',
  localField: '_environmentId',
  foreignField: '_id',
  justOne: true,
});

notificationSchema.virtual('template', {
  ref: 'NotificationTemplate',
  localField: '_templateId',
  foreignField: '_id',
  justOne: true,
});

notificationSchema.virtual('subscriber', {
  ref: 'Subscriber',
  localField: '_subscriberId',
  foreignField: '_id',
  justOne: true,
});

notificationSchema.virtual('jobs', {
  ref: 'Job',
  localField: '_id',
  foreignField: '_notificationId',
});

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Notification =
  (mongoose.models.Notification as mongoose.Model<NotificationDBModel>) ||
  mongoose.model<NotificationDBModel>('Notification', notificationSchema);
