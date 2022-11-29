import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';
import * as mongooseDelete from 'mongoose-delete';
import { schemaOptions } from '../schema-default.options';
import { SubscriberEntity } from './subscriber.entity';

const subscriberSchema = new Schema(
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
    channels: [Schema.Types.Mixed],
  },
  schemaOptions
);

subscriberSchema.index({ _environmentId: 1, userId: 1 });
subscriberSchema.index({ _environmentId: 1, subscriberId: 1 });

subscriberSchema.plugin(mongooseDelete, { deletedAt: true, deletedBy: true, overrideMethods: 'all' });

interface ISubscriberDocument extends SubscriberEntity, Document {
  _id: never;
  __v: never;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Subscriber =
  mongoose.models.Subscriber || mongoose.model<ISubscriberDocument>('Subscriber', subscriberSchema);
