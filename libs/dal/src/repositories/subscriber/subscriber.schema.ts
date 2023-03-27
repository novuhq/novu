import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';
import * as mongooseDelete from 'mongoose-delete';

import { schemaOptions } from '../schema-default.options';
import { SubscriberDBModel } from './subscriber.entity';

const subscriberSchema = new Schema<SubscriberDBModel>(
  {
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

subscriberSchema.index({ _environmentId: 1, subscriberId: 1 });

subscriberSchema.plugin(mongooseDelete, { deletedAt: true, deletedBy: true, overrideMethods: 'all' });

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Subscriber =
  (mongoose.models.Subscriber as mongoose.Model<SubscriberDBModel>) ||
  mongoose.model<SubscriberDBModel>('Subscriber', subscriberSchema);
