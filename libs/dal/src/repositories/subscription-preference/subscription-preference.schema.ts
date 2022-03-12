import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';
import { schemaOptions } from '../schema-default.options';
import { SubscriptionPreferenceEntity } from './subscription-preference.entity';

// eslint-disable-next-line @typescript-eslint/naming-convention
const SubscriptionPreferenceSchema = new Schema(
  {
    name: Schema.Types.String,
  },
  schemaOptions
);

interface ISubscriptionPreferenceDocument extends SubscriptionPreferenceEntity, Document {
  _id: never;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const SubscriptionPreference =
  mongoose.models.SubscriptionPreference ||
  mongoose.model<ISubscriptionPreferenceDocument>('SubscriptionPreference', SubscriptionPreferenceSchema);
