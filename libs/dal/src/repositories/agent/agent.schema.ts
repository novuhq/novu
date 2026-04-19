import mongoose, { Schema } from 'mongoose';

import { schemaOptions } from '../schema-default.options';
import { AgentDBModel } from './agent.entity';

const agentSchema = new Schema<AgentDBModel>(
  {
    name: {
      type: Schema.Types.String,
      required: true,
    },
    identifier: {
      type: Schema.Types.String,
      required: true,
    },
    description: Schema.Types.String,
    active: {
      type: Schema.Types.Boolean,
      default: true,
    },
    behavior: {
      acknowledgeOnReceived: Schema.Types.Boolean,
      reactionOnResolved: Schema.Types.String,
    },
    bridgeUrl: Schema.Types.String,
    devBridgeUrl: Schema.Types.String,
    devBridgeActive: {
      type: Schema.Types.Boolean,
      default: false,
    },
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    _environmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
    },
  },
  schemaOptions
);

agentSchema.index({ _environmentId: 1 });
agentSchema.index({ identifier: 1, _environmentId: 1 }, { unique: true });

export const Agent =
  (mongoose.models.Agent as mongoose.Model<AgentDBModel>) || mongoose.model<AgentDBModel>('Agent', agentSchema);
