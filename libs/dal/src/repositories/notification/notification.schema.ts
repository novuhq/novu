import { SeverityLevelEnum } from '@novu/shared';
import mongoose, { Schema } from 'mongoose';
import { schemaOptions } from '../schema-default.options';
import { NotificationDBModel } from './notification.entity';

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
    topics: [
      {
        _topicId: {
          type: Schema.Types.ObjectId,
          ref: 'Topic',
        },
        topicKey: {
          type: Schema.Types.String,
        },
      },
    ],
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
    controls: {
      type: Schema.Types.Mixed,
    },
    tags: {
      type: [Schema.Types.String],
    },
    severity: {
      type: Schema.Types.String,
      enum: SeverityLevelEnum,
      default: SeverityLevelEnum.NONE,
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
/*
 * There was no point indexing old records,
 * we are not searching anything more than a month back
 */
notificationSchema.index(
  {
    _environmentId: 1,
    createdAt: 1,
  },
  {
    partialFilterExpression: {
      createdAt: {
        $gte: new Date('2025-01-01T00:00:00Z'),
      },
    },
  }
);

/*
 * This index was created to push entries to Online Archive
 */
notificationSchema.index({ createdAt: 1 });

export const Notification =
  (mongoose.models.Notification as mongoose.Model<NotificationDBModel>) ||
  mongoose.model<NotificationDBModel>('Notification', notificationSchema);
