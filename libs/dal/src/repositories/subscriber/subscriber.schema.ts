import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';
import { schemaOptions } from '../schema-default.options';
import { SubscriberEntity } from './subscriber.entity';

const subscriberSchema = new Schema(
  {
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    _applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Application',
      index: true,
    },
    firstName: Schema.Types.String,
    lastName: Schema.Types.String,
    phone: Schema.Types.String,
    subscriberId: Schema.Types.String,
    email: Schema.Types.String,
  },
  schemaOptions
);

subscriberSchema.index({ _applicationId: 1, userId: 1 });

interface ISubscriberDocument extends SubscriberEntity, Document {
  _id: never;
}

export const Subscriber =
  mongoose.models.Subscriber || mongoose.model<ISubscriberDocument>('Subscriber', subscriberSchema);
