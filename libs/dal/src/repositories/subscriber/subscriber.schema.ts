import * as mongoose from 'mongoose';
import { IndexOptions, Schema } from 'mongoose';
import * as mongooseDelete from 'mongoose-delete';

import { schemaOptions } from '../schema-default.options';
import { SubscriberDBModel, SubscriberEntity } from './subscriber.entity';
import { IndexDefinition } from '../../shared/types';

const subscriberSchema = new Schema<SubscriberDBModel>(
  {
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    _environmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
    },
    firstName: Schema.Types.String,
    lastName: Schema.Types.String,
    phone: Schema.Types.String,
    subscriberId: Schema.Types.String,
    email: Schema.Types.String,
    avatar: Schema.Types.String,
    locale: Schema.Types.String,
    channels: [Schema.Types.Mixed],
    isOnline: {
      type: Schema.Types.Boolean,
      required: false,
    },
    lastOnlineAt: Schema.Types.Date,
    data: Schema.Types.Mixed,
  },
  schemaOptions
);

/*
 * This index was initially created to optimize:
 *
 * Path: apps/api/src/app/events/usecases/trigger-event-to-all/trigger-event-to-all.usecase.ts
 * Context: execute()
 * Query: findBatch({
 *       _environmentId: command.environmentId,
 *       _organizationId: command.organizationId,
 *     }
 *
 * Path: apps/api/src/app/subscribers/usecases/get-subscribers/get-subscriber.usecase.ts
 * Context: execute()
 * Query: count({
 *    _environmentId: command.environmentId,
 *    _organizationId: command.organizationId,
 *  });
 *
 * Path: apps/api/src/app/subscribers/usecases/get-subscribers/get-subscriber.usecase.ts
 * Context: execute()
 * Query: find({
 *     _environmentId: command.environmentId,
 *     _organizationId: command.organizationId,
 *   });
 *
 * Path: libs/dal/src/repositories/subscriber/subscriber.repository.ts
 * Context: searchSubscribers()
 * Query: find({
 *    _environmentId: environmentId,
 *      {email: {$in: emails,}
 */
subscriberSchema.index({
  _environmentId: 1,
  email: 1,
});

/*
 * This index was initially created to optimize:
 *
 * Path: libs/dal/src/repositories/subscriber/subscriber.repository.ts
 * Context: searchSubscribers()
 * Query: find({
 *    _environmentId: environmentId,
 *    $or: {
 *      {email: {$in: emails,}
 *      {email: {
 *          $regex: regExpEscape(search),
 *          $options: 'i',},}
 *        },
 *      {subscriberId: search,}
 *  });
 * Path: libs/dal/src/repositories/subscriber/subscriber.repository.ts
 * Context: findBySubscriberId()
 * Query: findOne(
 *     {
 *       _environmentId: environmentId,
 *       subscriberId,
 *     }
 *
 * Path: libs/dal/src/repositories/subscriber/subscriber.repository.ts
 * Context: searchByExternalSubscriberIds()
 * Query: find({
 *     _environmentId,
 *     _organizationId,
 *     subscriberId: {
 *       $in: externalSubscriberIds,
 *     },
 *   });
 *
 * Path: libs/dal/src/repositories/subscriber/subscriber.repository.ts
 * Context: delete()
 * Query: findOne({
 *    _environmentId: query._environmentId,
 *    subscriberId: query.subscriberId,
 *  });
 *
 *
 * Path: libs/dal/src/repositories/subscriber/subscriber.repository.ts
 * Context: delete()
 * Query: delete({
 *     _environmentId: query._environmentId,
 *     subscriberId: query.subscriberId,
 *   });
 *
 *
 * Path: libs/dal/src/repositories/subscriber/subscriber.repository.ts
 * Context: findDeleted()
 * Query: findDeleted({
 *    _environmentId: query._environmentId,
 *    subscriberId: query.subscriberId,
 *  });
 *
 * Path: apps/api/src/app/subscribers/usecases/remove-subscriber/remove-subscriber.usecase.ts
 * Context: execute()
 * Query: delete({
 *      _environmentId: subscriber._environmentId,
 *      _organizationId: subscriber._organizationId,
 *      subscriberId: subscriber.subscriberId,
 *    });
 *
 * Path: apps/api/src/app/subscribers/usecases/remove-subscriber/remove-subscriber.usecase.ts
 * Context: execute()
 * Query: delete({
 *      _environmentId: subscriber._environmentId,
 *      _organizationId: subscriber._organizationId,
 *      subscriberId: subscriber.subscriberId,
 *    });
 *
 * Path: apps/api/src/app/events/usecases/send-message/send-message.base.ts
 * Context: getSubscriberBySubscriberId()
 * Query: findOne({
 *    subscriberId,
 *    _environmentId,
 *  });
 *
 * Path: apps/api/src/app/events/usecases/send-message/send-message.usecase.ts
 * Context: getSubscriberBySubscriberId()
 * Query: findOne({
 *     subscriberId,
 *     _environmentId,
 *   });
 *
 * Path: apps/api/src/app/integrations/usecases/get-in-app-activated/get-in-app-activated.usecase.ts
 * Context: execute()
 * Query: count({
 *    _organizationId: command.organizationId,
 *    _environmentId: command.environmentId,
 *    isOnline: { $exists: true },
 *    subscriberId: /on-boarding-subscriber/i,
 *  });
 */

/*
 * This index needs to be unique and exclude "_id" to prevent duplicate subscribers during concurrent creation attempts.
 * This situation could occur if two attempts are made to create a subscriber with the same subscriberId (e.g., 2022) simultaneously.
 * We want to ensure that the _id field is not included in the index to avoid scenarios where MongoDB's unique validation fails to prevent duplicates, such as:
 * subscriberId_2022:environmentId_123:_id_123
 * subscriberId_2022:environmentId_123:_id_1234
 * We expect an exception to be thrown when attempting to create two subscribers with the same subscriberId (e.g., 2022) within the same environment.
 *
 * We can not add `deleted` field to the index the client wont be able to delete twice subscriber with the same subscriberId.
 */
index(
  {
    subscriberId: 1,
    _environmentId: 1,
  },
  { unique: true }
);

subscriberSchema.plugin(mongooseDelete, { deletedAt: true, deletedBy: true, overrideMethods: 'all' });

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Subscriber =
  (mongoose.models.Subscriber as mongoose.Model<SubscriberDBModel>) ||
  mongoose.model<SubscriberDBModel>('Subscriber', subscriberSchema);

function index(fields: IndexDefinition<SubscriberEntity>, options?: IndexOptions) {
  subscriberSchema.index(fields, options);
}
