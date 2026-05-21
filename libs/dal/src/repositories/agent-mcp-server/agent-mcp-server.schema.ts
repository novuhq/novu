import { AgentRuntimeProviderIdEnum } from '@novu/shared';
import mongoose, { Schema } from 'mongoose';

import { schemaOptions } from '../schema-default.options';
import { AgentMcpServerDBModel } from './agent-mcp-server.entity';

const externalProjectionSchema = new Schema({
  providerId: {
    type: Schema.Types.String,
    required: true,
    enum: Object.values(AgentRuntimeProviderIdEnum),
  },
  mcpServerName: {
    type: Schema.Types.String,
    required: true,
  },
  syncedAt: {
    type: Schema.Types.Date,
    required: true,
  },
});

const lastErrorSchema = new Schema({
  code: {
    type: Schema.Types.String,
    required: true,
  },
  message: {
    type: Schema.Types.String,
    required: true,
  },
  at: {
    type: Schema.Types.Date,
    required: true,
  },
});

const agentMcpServerSchema = new Schema<AgentMcpServerDBModel>(
  {
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    _environmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
      required: true,
    },
    _agentId: {
      type: Schema.Types.ObjectId,
      ref: 'Agent',
      required: true,
    },
    mcpId: {
      type: Schema.Types.String,
      required: true,
    },
    enabled: {
      type: Schema.Types.Boolean,
      required: true,
      default: true,
    },
    defaultScope: {
      type: Schema.Types.String,
      required: true,
      enum: ['environment', 'agent', 'subscriber'],
      default: 'subscriber',
    },
    defaultAuthMode: {
      type: Schema.Types.String,
      required: true,
      enum: ['dcr', 'novu-app', 'user-app'],
      default: 'dcr',
    },
    externalProjection: {
      type: externalProjectionSchema,
      required: false,
    },
    status: {
      type: Schema.Types.String,
      required: true,
      enum: ['active', 'syncing', 'error', 'disabled'],
      default: 'active',
    },
    lastError: {
      type: lastErrorSchema,
      required: false,
    },
  },
  schemaOptions
);

agentMcpServerSchema.index({ _environmentId: 1, _agentId: 1, mcpId: 1 }, { unique: true });
agentMcpServerSchema.index({ _agentId: 1 });
agentMcpServerSchema.index({ _environmentId: 1 });

export const AgentMcpServer =
  (mongoose.models.AgentMcpServer as mongoose.Model<AgentMcpServerDBModel>) ||
  mongoose.model<AgentMcpServerDBModel>('AgentMcpServer', agentMcpServerSchema);
