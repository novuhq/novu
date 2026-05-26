import { ChannelEndpointType, ENDPOINT_TYPES } from '@novu/shared';
import mongoose, { Schema } from 'mongoose';
import { schemaOptions } from '../schema-default.options';
import { ChannelEndpointDBModel } from './channel-endpoint.entity';

const PLATFORM_USER_ENDPOINT_TYPES: ChannelEndpointType[] = [ENDPOINT_TYPES.SLACK_USER, ENDPOINT_TYPES.MS_TEAMS_USER];

const channelEndpointSchema = new Schema<ChannelEndpointDBModel>(
  {
    identifier: {
      type: Schema.Types.String,
      required: true,
    },
    _organizationId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Organization',
    },
    _environmentId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Environment',
    },
    connectionIdentifier: {
      type: Schema.Types.String,
      required: false,
    },
    integrationIdentifier: {
      type: Schema.Types.String,
      required: true,
    },
    providerId: {
      type: Schema.Types.String,
      required: true,
    },
    channel: {
      type: Schema.Types.String,
      required: true,
    },
    subscriberId: {
      type: Schema.Types.String,
      required: true,
    },
    contextKeys: {
      type: [Schema.Types.String],
      required: true,
      default: [],
    },
    type: {
      type: Schema.Types.String,
      enum: Object.values(ENDPOINT_TYPES),
      required: true,
    },
    endpoint: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  schemaOptions
);

channelEndpointSchema.index({ _environmentId: 1, identifier: 1 }, { unique: true });
channelEndpointSchema.index({ _environmentId: 1, subscriberId: 1, channel: 1 });

/*
 * Enforces one ChannelEndpoint row per (env, integration, platform user). Scoped to
 * the platform-user endpoint types Slack and Teams use for agent auto-provisioning;
 * other endpoint types (slack_channel, telegram_chat, phone, …) keep their existing
 * shape and may legitimately repeat the same identity value. The `endpoint.userId`
 * existence clause keeps documents that lack the field out of the partial index
 * entirely, so they can't share a `null` key and trip a false-positive duplicate.
 */
channelEndpointSchema.index(
  { _environmentId: 1, integrationIdentifier: 1, type: 1, 'endpoint.userId': 1 },
  {
    name: 'unique_platform_user_per_integration',
    unique: true,
    partialFilterExpression: {
      type: { $in: PLATFORM_USER_ENDPOINT_TYPES },
      'endpoint.userId': { $exists: true },
    },
  }
);

export const ChannelEndpoint =
  (mongoose.models.ChannelEndpoint as mongoose.Model<ChannelEndpointDBModel>) ||
  mongoose.model<ChannelEndpointDBModel>('ChannelEndpoint', channelEndpointSchema);
