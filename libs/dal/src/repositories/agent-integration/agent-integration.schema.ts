import mongoose, { Schema } from 'mongoose';

import { schemaOptions } from '../schema-default.options';
import { AgentIntegrationDBModel } from './agent-integration.entity';

const agentIntegrationSchema = new Schema<AgentIntegrationDBModel>(
  {
    _agentId: {
      type: Schema.Types.ObjectId,
      ref: 'Agent',
    },
    _integrationId: {
      type: Schema.Types.ObjectId,
      ref: 'Integration',
    },
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    _environmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
    },
    connectedAt: {
      type: Date,
      required: false,
      default: null,
    },
  },
  schemaOptions
);

agentIntegrationSchema.index(
  {
    _agentId: 1,
    _integrationId: 1,
    _environmentId: 1,
  },
  { unique: true }
);

agentIntegrationSchema.index({ _agentId: 1 });
agentIntegrationSchema.index({ _environmentId: 1 });

export const AgentIntegration =
  (mongoose.models.AgentIntegration as mongoose.Model<AgentIntegrationDBModel>) ||
  mongoose.model<AgentIntegrationDBModel>('AgentIntegration', agentIntegrationSchema);
