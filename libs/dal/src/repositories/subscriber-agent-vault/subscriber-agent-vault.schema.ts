import mongoose, { Schema } from 'mongoose';

import { schemaOptions } from '../schema-default.options';
import { SubscriberAgentVaultDBModel } from './subscriber-agent-vault.entity';

const subscriberAgentVaultSchema = new Schema<SubscriberAgentVaultDBModel>(
  {
    _environmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
    },
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    subscriberId: {
      type: Schema.Types.String,
      required: true,
    },
    _agentId: {
      type: Schema.Types.ObjectId,
      ref: 'Agent',
    },
    anthropicVaultId: {
      type: Schema.Types.String,
      required: true,
    },
    connections: [
      {
        _id: false,
        mcpServerName: Schema.Types.String,
        credentialId: Schema.Types.String,
        status: Schema.Types.String,
        connectedAt: Schema.Types.Date,
        lastUsedAt: Schema.Types.Date,
      },
    ],
  },
  schemaOptions
);

subscriberAgentVaultSchema.index(
  {
    _environmentId: 1,
    subscriberId: 1,
    _agentId: 1,
  },
  { unique: true }
);

subscriberAgentVaultSchema.index({ _agentId: 1 });
subscriberAgentVaultSchema.index({ _environmentId: 1, subscriberId: 1 });

export const SubscriberAgentVault =
  (mongoose.models.SubscriberAgentVault as mongoose.Model<SubscriberAgentVaultDBModel>) ||
  mongoose.model<SubscriberAgentVaultDBModel>('SubscriberAgentVault', subscriberAgentVaultSchema);
