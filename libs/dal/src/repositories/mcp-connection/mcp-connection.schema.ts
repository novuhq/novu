import { MCP_TOKEN_ENDPOINT_AUTH_METHODS } from '@novu/shared';
import mongoose, { Schema } from 'mongoose';

import { schemaOptions } from '../schema-default.options';
import { McpConnectionDBModel } from './mcp-connection.entity';

const authSchema = new Schema(
  {
    accessToken: {
      type: Schema.Types.String,
      required: false,
    },
    refreshToken: {
      type: Schema.Types.String,
      required: false,
    },
    expiresAt: {
      type: Schema.Types.Date,
      required: false,
    },
    tokenType: {
      type: Schema.Types.String,
      required: false,
    },
    scopes: {
      type: [Schema.Types.String],
      required: false,
    },
    vaultCredentialId: {
      type: Schema.Types.String,
      required: false,
    },
    externalVaultId: {
      type: Schema.Types.String,
      required: false,
    },
  },
  { _id: false }
);

const oauthStateSchema = new Schema({
  pkceVerifier: {
    type: Schema.Types.String,
    required: false,
  },
  initiatedAt: {
    type: Schema.Types.Date,
    required: true,
  },
  expectedIssuer: {
    type: Schema.Types.String,
    required: false,
  },
  resource: {
    type: Schema.Types.String,
    required: false,
  },
  /**
   * One-shot OAuth callback claim. The callback usecase sets this in the
   * same `findOneAndUpdate` that gates token exchange, then filters on
   * its absence so concurrent callbacks for the same signed state can't
   * both reach the token endpoint. See `mcp-oauth-callback.usecase.ts`.
   */
  callbackClaimedAt: {
    type: Schema.Types.Date,
    required: false,
  },
  /**
   * `novu-app` mode only: AS `token_endpoint` copied from the catalog at
   * authorize time so the callback can do the token exchange without a
   * persistent `oauthClient` row. Cleared with the rest of `oauthState`
   * when the connection lands in `connected`.
   */
  tokenEndpoint: {
    type: Schema.Types.String,
    required: false,
  },
  /**
   * `novu-app` mode only: AS `authorization_endpoint` mirror of
   * `tokenEndpoint`. Kept for parity so the callback can reconstruct an
   * ephemeral `oauthClient` shape for vault push.
   */
  authorizationEndpoint: {
    type: Schema.Types.String,
    required: false,
  },
});

const oauthClientSchema = new Schema(
  {
    clientId: {
      type: Schema.Types.String,
      required: true,
    },
    clientSecret: {
      type: Schema.Types.String,
      required: false,
    },
    clientSecretExpiresAt: {
      type: Schema.Types.Date,
      required: false,
    },
    registrationAccessToken: {
      type: Schema.Types.String,
      required: false,
    },
    registrationClientUri: {
      type: Schema.Types.String,
      required: false,
    },
    issuer: {
      type: Schema.Types.String,
      required: true,
    },
    authorizationEndpoint: {
      type: Schema.Types.String,
      required: true,
    },
    tokenEndpoint: {
      type: Schema.Types.String,
      required: true,
    },
    registrationEndpoint: {
      type: Schema.Types.String,
      required: false,
    },
    scopesGranted: {
      type: [Schema.Types.String],
      required: false,
    },
    tokenEndpointAuthMethod: {
      type: Schema.Types.String,
      required: false,
      enum: MCP_TOKEN_ENDPOINT_AUTH_METHODS,
    },
    redirectUri: {
      type: Schema.Types.String,
      required: false,
    },
    registeredAt: {
      type: Schema.Types.Date,
      required: true,
    },
  },
  { _id: false }
);

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

const lastErrorSchema = new Schema(
  {
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
  },
  { _id: false }
);

const mcpConnectionSchema = new Schema<McpConnectionDBModel>(
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
    scope: {
      type: Schema.Types.String,
      required: true,
      enum: ['environment', 'agent', 'subscriber'],
    },
    mcpId: {
      type: Schema.Types.String,
      required: true,
    },
    _agentMcpServerId: {
      type: Schema.Types.ObjectId,
      ref: 'AgentMcpServer',
      required: false,
      default: null,
      // Scope-to-owner invariant: `agent` / `subscriber` rows MUST point at
      // an enablement row; `environment` rows MUST NOT. Enforced at write
      // time by Mongoose so a buggy caller can't persist a malformed shape.
      validate: {
        validator(this: McpConnectionDBModel, value: unknown) {
          if (this.scope === 'environment') return value == null;

          return value != null;
        },
        message: '_agentMcpServerId must be set for `agent`/`subscriber` scope and absent for `environment` scope',
      },
    },
    _subscriberId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscriber',
      required: false,
      default: null,
      // Scope-to-owner invariant: only `subscriber` rows carry a subscriber
      // pointer; `environment` / `agent` rows MUST leave this null so the
      // partial subscriber-uniqueness index below only applies where it's
      // semantically meaningful.
      validate: {
        validator(this: McpConnectionDBModel, value: unknown) {
          if (this.scope === 'subscriber') return value != null;

          return value == null;
        },
        message: '_subscriberId must be set ONLY for `subscriber` scope',
      },
    },
    authMode: {
      type: Schema.Types.String,
      required: true,
      enum: ['dcr', 'novu-app', 'user-app'],
    },
    status: {
      type: Schema.Types.String,
      required: true,
      enum: ['pending_oauth', 'connected', 'expired', 'revoked', 'error'],
    },
    auth: {
      type: authSchema,
      required: false,
    },
    oauthState: {
      type: oauthStateSchema,
      required: false,
    },
    oauthClient: {
      type: oauthClientSchema,
      required: false,
    },
    lastError: {
      type: lastErrorSchema,
      required: false,
    },
    toolTrust: {
      type: toolTrustSchema,
      required: false,
    },
    connectedAt: {
      type: Schema.Types.Date,
      required: false,
      default: null,
    },
  },
  schemaOptions
);

// Subscriber-scope uniqueness: one connection per (enablement, subscriber,
// mcp). Pinned to `scope: 'subscriber'` so a stray non-subscriber row
// (validators above already prevent this, but the index acts as a second
// line of defence) can't accidentally claim the unique slot.
mcpConnectionSchema.index(
  { _agentMcpServerId: 1, _subscriberId: 1, mcpId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      scope: 'subscriber',
      _agentMcpServerId: { $type: 'objectId' },
      _subscriberId: { $type: 'objectId' },
    },
  }
);

mcpConnectionSchema.index(
  { _agentMcpServerId: 1, scope: 1 },
  {
    unique: true,
    partialFilterExpression: { _agentMcpServerId: { $type: 'objectId' }, scope: 'agent' },
  }
);

mcpConnectionSchema.index(
  { _environmentId: 1, scope: 1, mcpId: 1 },
  {
    unique: true,
    partialFilterExpression: { scope: 'environment' },
  }
);

mcpConnectionSchema.index({ _subscriberId: 1, _environmentId: 1 });
mcpConnectionSchema.index({ _agentMcpServerId: 1 });

export const McpConnection =
  (mongoose.models.McpConnection as mongoose.Model<McpConnectionDBModel>) ||
  mongoose.model<McpConnectionDBModel>('McpConnection', mcpConnectionSchema);
