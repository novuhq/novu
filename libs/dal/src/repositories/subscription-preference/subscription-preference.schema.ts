import mongoose, { Schema } from 'mongoose';

import { schemaOptions } from '../schema-default.options';
import { SubscriptionPreferenceDBModel } from './subscription-preference.entity';

const SubscriptionPreferenceSchema = new Schema<SubscriptionPreferenceDBModel>(
  {
    name: Schema.Types.String,
  },
  schemaOptions
);

export const SubscriptionPreference =
  (mongoose.models.SubscriptionPreference as mongoose.Model<SubscriptionPreferenceDBModel>) ||
  mongoose.model<SubscriptionPreferenceDBModel>('SubscriptionPreference', SubscriptionPreferenceSchema);
