import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';
import * as mongooseDelete from 'mongoose-delete';

import { schemaOptions } from '../schema-default.options';
import { WebhookTriggerDBModel } from './webhook-trigger.entity';

const webhookTriggerSchema = new Schema<WebhookTriggerDBModel>(
  {
    name: Schema.Types.String,
    description: Schema.Types.String,
    active: {
      type: Schema.Types.Boolean,
      default: false,
    },
    _environmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
    },
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    _templateId: {
      type: Schema.Types.ObjectId,
      ref: 'NotificationTemplate',
    },
    _creatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    token: Schema.Types.String,
    variables: [
      {
        name: Schema.Types.String,
        type: {
          type: Schema.Types.String,
        },
      },
    ],
  },
  schemaOptions
);

webhookTriggerSchema.index({
  _environmentId: 1,
});

webhookTriggerSchema.index({
  token: 1,
});

webhookTriggerSchema.plugin(mongooseDelete, { deletedAt: true, deletedBy: true, overrideMethods: 'all' });

// eslint-disable-next-line @typescript-eslint/naming-convention
export const WebhookTrigger =
  (mongoose.models.NotificationTemplate as mongoose.Model<WebhookTriggerDBModel>) ||
  mongoose.model<WebhookTriggerDBModel>('WebhookTrigger', webhookTriggerSchema);
