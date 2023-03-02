import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';

import { schemaOptions } from '../schema-default.options';
import { SubscriptionPreferenceDBModel } from './subscription-preference.entity';

// eslint-disable-next-line @typescript-eslint/naming-convention
const SubscriptionPreferenceSchema = new Schema<SubscriptionPreferenceDBModel>(
  {
    name: Schema.Types.String,
  },
  schemaOptions
);

// eslint-disable-next-line @typescript-eslint/naming-convention
export const SubscriptionPreference =
  (mongoose.models.SubscriptionPreference as mongoose.Model<SubscriptionPreferenceDBModel>) ||
  mongoose.model<SubscriptionPreferenceDBModel>('SubscriptionPreference', SubscriptionPreferenceSchema);
