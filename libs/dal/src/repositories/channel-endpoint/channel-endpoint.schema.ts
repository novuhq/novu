import { ENDPOINT_TYPES } from '@novu/shared';
import mongoose, { Schema } from 'mongoose';
import { schemaOptions } from '../schema-default.options';
import { ChannelEndpointDBModel } from './channel-endpoint.entity';

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

export const ChannelEndpoint =
  (mongoose.models.ChannelEndpoint as mongoose.Model<ChannelEndpointDBModel>) ||
  mongoose.model<ChannelEndpointDBModel>('ChannelEndpoint', channelEndpointSchema);
