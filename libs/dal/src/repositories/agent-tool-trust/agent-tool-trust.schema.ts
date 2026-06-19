import mongoose, { Schema } from 'mongoose';

import { schemaOptions } from '../schema-default.options';
import { AgentToolTrustDBModel } from './agent-tool-trust.entity';

const toolTrustSchema = new Schema(
  {
    serverDefault: {
      type: Schema.Types.String,
      required: false,
      enum: ['always_ask', 'always_allow'],
    },
    tools: {
      type: Schema.Types.Map,
      of: {
        type: Schema.Types.String,
        enum: ['always_ask', 'always_allow'],
      },
      required: false,
    },
  },
  { _id: false }
);

const trustSchema = new Schema(
  {
    // Keyed by `mcpServerName`; one trust bucket per connected MCP server.
    mcp: {
      type: Schema.Types.Map,
      of: toolTrustSchema,
      required: false,
    },
    // Catch-all bucket for non-MCP (directly-invoked) tools: provider built-in
    // toolset, user-defined custom tools, and any future non-MCP tool type.
    direct: {
      type: toolTrustSchema,
      required: false,
    },
  },
  { _id: false }
);

const agentToolTrustSchema = new Schema<AgentToolTrustDBModel>(
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
    _subscriberId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscriber',
      required: true,
    },
    trust: {
      type: trustSchema,
      required: true,
      default: {},
    },
  },
  schemaOptions
);

// Single trust row per (env, agent, subscriber) — the source of truth.
agentToolTrustSchema.index({ _environmentId: 1, _agentId: 1, _subscriberId: 1 }, { unique: true });

export const AgentToolTrust =
  (mongoose.models.AgentToolTrust as mongoose.Model<AgentToolTrustDBModel>) ||
  mongoose.model<AgentToolTrustDBModel>('AgentToolTrust', agentToolTrustSchema);
