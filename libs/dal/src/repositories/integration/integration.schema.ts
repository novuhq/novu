import { AGENT_INBOX_PROVIDER_IDS, EmailProviderIdEnum } from '@novu/shared';
import mongoose, { Schema } from 'mongoose';

import { schemaOptions } from '../schema-default.options';
import { IntegrationDBModel } from './integration.entity';

const mongooseDelete = require('mongoose-delete');

const integrationSchema = new Schema<IntegrationDBModel>(
  {
    _environmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
      index: true,
    },
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    providerId: Schema.Types.String,
    channel: Schema.Types.String,
    kind: {
      type: Schema.Types.String,
      enum: ['delivery', 'agent'],
      default: 'delivery',
    },
    credentials: {
      apiVersion: Schema.Types.String,
      apiKey: Schema.Types.String,
      user: Schema.Types.String,
      secretKey: Schema.Types.String,
      hmacSecretKeyEncoding: Schema.Types.String,
      domain: Schema.Types.String,
      password: Schema.Types.String,
      host: Schema.Types.String,
      port: Schema.Types.String,
      secure: Schema.Types.Boolean,
      region: Schema.Types.String,
      accountSid: Schema.Types.String,
      messageProfileId: Schema.Types.String,
      token: Schema.Types.String,
      from: Schema.Types.String,
      senderName: Schema.Types.String,
      applicationId: Schema.Types.String,
      clientId: Schema.Types.String,
      projectName: Schema.Types.String,
      serviceAccount: Schema.Types.String,
      baseUrl: Schema.Types.String,
      webhookUrl: Schema.Types.String,
      method: Schema.Types.String,
      headers: Schema.Types.String,
      body: Schema.Types.String,
      routingMode: Schema.Types.String,
      requireTls: Schema.Types.Boolean,
      ignoreTls: Schema.Types.Boolean,
      tlsOptions: Schema.Types.Mixed,
      redirectUrl: Schema.Types.String,
      hmac: Schema.Types.Boolean,
      ipPoolName: Schema.Types.String,
      configurationSetName: Schema.Types.String,
      apiKeyRequestHeader: Schema.Types.String,
      secretKeyRequestHeader: Schema.Types.String,
      idPath: Schema.Types.String,
      datePath: Schema.Types.String,
      authenticateByToken: Schema.Types.Boolean,
      authenticationTokenKey: Schema.Types.String,
      instanceId: Schema.Types.String,
      alertUid: Schema.Types.String,
      title: Schema.Types.String,
      imageUrl: Schema.Types.String,
      state: Schema.Types.String,
      externalLink: Schema.Types.String,
      apiToken: Schema.Types.String,
      channelId: Schema.Types.String,
      phoneNumberIdentification: Schema.Types.String,
      businessAccountId: Schema.Types.String,
      accessKey: Schema.Types.String,
      appSid: Schema.Types.String,
      senderId: Schema.Types.String,
      servicePlanId: Schema.Types.String,
      tenantId: Schema.Types.String,
      signingSecret: Schema.Types.String,
      outboundIntegrationId: Schema.Types.String,
      outboundConnectedAt: Schema.Types.String,
      whatsNextCompletedAt: Schema.Types.String,
      useFromAddressOverride: Schema.Types.Boolean,
      fromAddressOverride: Schema.Types.String,
      emailSlugPrefix: Schema.Types.String,
      inboxRoutingKey: Schema.Types.String,
      inboxDomain: Schema.Types.String,
      sharedInboxDisabled: Schema.Types.Boolean,
      AppIOBaseUrl: Schema.Types.String,
      AppIOSubscriptionId: Schema.Types.String,
      AppIOBearerToken: Schema.Types.String,
      AppIOOriginalSignature: Schema.Types.String,
      externalEnvironmentId: Schema.Types.String,
      externalVaultId: Schema.Types.String,
      externalWorkspaceId: Schema.Types.String,
      isNovuManaged: Schema.Types.Boolean,
    },
    configurations: {
      inboundWebhookEnabled: Schema.Types.Boolean,
      inboundWebhookSigningKey: Schema.Types.String,
      configurationSetName: Schema.Types.String,
      inboxCount: Schema.Types.String,
      payloadSchema: Schema.Types.String,
    },
    provisioning: {
      status: {
        type: Schema.Types.String,
        enum: ['pending', 'ready', 'failed'],
      },
      startedAt: Schema.Types.String,
      completedAt: Schema.Types.String,
      errorMessage: Schema.Types.String,
      teamsAppCatalogId: Schema.Types.String,
    },
    active: {
      type: Schema.Types.Boolean,
      default: false,
    },
    name: Schema.Types.String,
    identifier: Schema.Types.String,
    priority: {
      type: Schema.Types.Number,
      default: 0,
    },
    primary: {
      type: Schema.Types.Boolean,
      default: false,
    },
    conditions: [
      {
        isNegated: Schema.Types.Boolean,
        type: {
          type: Schema.Types.String,
        },
        value: Schema.Types.String,
        children: [
          {
            field: Schema.Types.String,
            value: Schema.Types.Mixed,
            operator: Schema.Types.String,
            on: Schema.Types.String,
          },
        ],
      },
    ],
    rules: {
      type: Schema.Types.Mixed,
      required: false,
    },
    connected: Schema.Types.Boolean,
    _parentId: {
      type: Schema.Types.ObjectId,
      required: false,
      default: null,
    },
  },
  schemaOptions
);

integrationSchema.index({
  _organizationId: 1,
  active: 1,
});

integrationSchema.index({
  _environmentId: 1,
});

/**
 * Globally-unique routing key for agent shared inboxes
 * (`{emailSlugPrefix}-{inboxRoutingKey}@<shared-domain>`). The partial filter
 * covers Novu Email and Agent Email Inbox so the two cannot claim the same
 * key on the shared domain. Other providers stay unconstrained.
 *
 * Changing this filter on an existing database requires the drop-and-recreate
 * migration `agent-email-inbox-routing-key-index` — MongoDB rejects an
 * in-place partial-filter change with IndexOptionsConflict.
 */
export const AGENT_INBOX_ROUTING_KEY_PARTIAL_FILTER = {
  providerId: { $in: [...AGENT_INBOX_PROVIDER_IDS] },
  'credentials.inboxRoutingKey': { $type: 'string' },
} as const;

integrationSchema.index(
  { 'credentials.inboxRoutingKey': 1 },
  {
    unique: true,
    partialFilterExpression: AGENT_INBOX_ROUTING_KEY_PARTIAL_FILTER,
  }
);

/**
 * One vanity Agent Inbox address per domain (`{emailSlugPrefix}@inboxDomain`).
 * Rows that still carry a routing key stay out of this index, so existing
 * `{slug}-{key}` mailboxes are not part of the claim.
 *
 * A new index: `agent-inbox-vanity-slug-index` creates it on databases that
 * do not auto-build indexes.
 */
export const AGENT_INBOX_VANITY_SLUG_INDEX = 'agent_inbox_vanity_slug';

export const AGENT_INBOX_VANITY_SLUG_PARTIAL_FILTER = {
  providerId: EmailProviderIdEnum.AgentEmailInbox,
  'credentials.inboxRoutingKey': { $exists: false },
  'credentials.emailSlugPrefix': { $type: 'string' },
  'credentials.inboxDomain': { $type: 'string' },
} as const;

integrationSchema.index(
  { 'credentials.emailSlugPrefix': 1, 'credentials.inboxDomain': 1 },
  {
    unique: true,
    name: AGENT_INBOX_VANITY_SLUG_INDEX,
    partialFilterExpression: AGENT_INBOX_VANITY_SLUG_PARTIAL_FILTER,
  }
);

integrationSchema.plugin(mongooseDelete, { deletedAt: true, deletedBy: true, overrideMethods: 'all' });

export const Integration =
  (mongoose.models.Integration as mongoose.Model<IntegrationDBModel>) ||
  mongoose.model<IntegrationDBModel>('Integration', integrationSchema);
