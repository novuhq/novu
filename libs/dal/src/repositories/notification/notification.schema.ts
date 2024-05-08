import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';

import { schemaOptions } from '../schema-default.options';
import { NotificationDBModel } from './notification.entity';
import { getTTLOptions } from '../../shared';

const notificationSchema = new Schema<NotificationDBModel>(
  {
    _templateId: {
      type: Schema.Types.ObjectId,
      ref: 'NotificationTemplate',
    },
    _environmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
    },
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    _subscriberId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscriber',
    },
    transactionId: {
      type: Schema.Types.String,
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
    expireAt: Schema.Types.Date,
  },
  schemaOptions
);

notificationSchema.index({ expireAt: 1 }, getTTLOptions());

notificationSchema.virtual('environment', {
  ref: 'Environment',
  localField: '_environmentId',
  foreignField: '_id',
  justOne: true,
});

notificationSchema.virtual('organization', {
  ref: 'Organization',
  localField: '_organizationId',
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

/*
 *
 * Path: libs/dal/src/repositories/notification/notification.repository.ts
 *    Context: findBySubscriberId()
 *        Query: find({_environmentId: environmentId,
 *                    _subscriberId: subscriberId,});
 *
 */
notificationSchema.index({
  _subscriberId: 1,
  _environmentId: 1,
});

/*
 * Path: libs/dal/src/repositories/notification/notification.repository.ts
 *    Context: getFeed()
 *        Query: find({
 *               transactionId: subscriberId,
 *               _environmentId: environmentId,
 *               _templateId = {$in: query.templates};
 *               _subscriberId = {$in: query._subscriberIds};
 *               channels = {$in: query.channels};
 *              .sort('-createdAt')});
 *
 * Path: libs/dal/src/repositories/notification/notification.repository.ts
 *     Context: getFeed()
 *         Query: MongooseModel.countDocuments({
 *                 transactionId: subscriberId,
 *                 _environmentId: environmentId,
 *                 _templateId = {$in: query.templates};
 *                 _subscriberId = {$in: query._subscriberIds};
 *                 channels = {$in: query.channels}});
 *
 */
notificationSchema.index({
  transactionId: 1,
  _environmentId: 1,
  createdAt: -1,
});

/*
 *
 * Path: libs/dal/src/repositories/notification/notification.repository.ts
 *    Context: getActivityGraphStats()
 *        Query: aggregate(
 *                {createdAt: { $gte: date }_environmentId: new Types.ObjectId(environmentId),
 *                { $sort: { createdAt: -1 } }})
 *
 * Path: libs/dal/src/repositories/notification/notification.repository.ts
 *    Context: getStats()
 *        Query: aggregate({
 *           _environmentId: this.convertStringToObjectId(environmentId),
 *           createdAt: {$gte: monthBefore}
 *           weekly: { $sum: { $cond: [{ $gte: ['$createdAt', weekBefore] }, 1, 0] } },
 *
 *
 * Path: ./get-platform-notification-usage.usecase.ts
 *    Context: execute()
 *        Query: organizationRepository.aggregate(
 *                $lookup:
 *        {
 *          from: 'notifications',
 *          localField: 'environments._id',
 *          foreignField: '_environmentId',
 *          as: 'notifications',
 *        }
 */
notificationSchema.index({
  _environmentId: 1,
  createdAt: -1,
});

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Notification =
  (mongoose.models.Notification as mongoose.Model<NotificationDBModel>) ||
  mongoose.model<NotificationDBModel>('Notification', notificationSchema);
