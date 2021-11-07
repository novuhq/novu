import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';
import { schemaOptions } from '../schema-default.options';
import { NotificationEntity } from './notification.entity';

const notificationSchema = new Schema(
  {
    _templateId: {
      type: Schema.Types.ObjectId,
      ref: 'NotificationTemplate',
      index: true,
    },
    _applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Application',
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
  },
  schemaOptions
);

notificationSchema.virtual('application', {
  ref: 'Application',
  localField: '_applicationId',
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

interface INotificationDocument extends NotificationEntity, Document {
  _id: never;
}

export const Notification =
  mongoose.models.Notification || mongoose.model<INotificationDocument>('Notification', notificationSchema);
