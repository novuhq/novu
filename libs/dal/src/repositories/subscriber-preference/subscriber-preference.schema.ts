import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';

import { schemaOptions } from '../schema-default.options';
import { PreferenceLevelEnum, SubscriberPreferenceDBModel } from './subscriber-preference.entity';

const subscriberPreferenceSchema = new Schema<SubscriberPreferenceDBModel>(
  {
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    _environmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
      index: true,
    },
    _subscriberId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscriber',
    },
    _templateId: {
      type: Schema.Types.ObjectId,
      ref: 'NotificationTemplate',
    },
    enabled: {
      type: Schema.Types.Boolean,
      default: true,
    },
    channels: {
      email: {
        type: Schema.Types.Boolean,
      },
      sms: {
        type: Schema.Types.Boolean,
      },
      in_app: {
        type: Schema.Types.Boolean,
      },
      chat: {
        type: Schema.Types.Boolean,
      },
      push: {
        type: Schema.Types.Boolean,
      },
    },
    level: {
      type: Schema.Types.String,
      enum: PreferenceLevelEnum,
    },
  },
  schemaOptions
);

subscriberPreferenceSchema.index({
  _subscriberId: 1,
  _templateId: 1,
});

subscriberPreferenceSchema.index({
  _subscriberId: 1,
  level: 1,
});

// eslint-disable-next-line @typescript-eslint/naming-convention
export const SubscriberPreference =
  (mongoose.models.SubscriberPreference as mongoose.Model<SubscriberPreferenceDBModel>) ||
  mongoose.model<SubscriberPreferenceDBModel>('SubscriberPreference', subscriberPreferenceSchema);
