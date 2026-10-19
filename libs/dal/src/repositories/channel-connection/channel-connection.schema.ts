import mongoose, { Schema } from 'mongoose';
import { schemaOptions } from '../schema-default.options';
import { ChannelConnectionDBModel } from './channel-connection.entity';

const channelConnectionSchema = new Schema<ChannelConnectionDBModel>(
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
      required: false,
      default: null,
    },
    contextKeys: {
      type: [Schema.Types.String],
      required: true,
      default: [],
    },
    workspace: {
      type: Schema.Types.Mixed,
      required: true,
    },
    auth: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  schemaOptions
);

channelConnectionSchema.index({ _environmentId: 1, identifier: 1 }, { unique: true });
channelConnectionSchema.index({ _environmentId: 1, subscriberId: 1, integrationIdentifier: 1 });

export const ChannelConnection =
  (mongoose.models.ChannelConnection as mongoose.Model<ChannelConnectionDBModel>) ||
  mongoose.model<ChannelConnectionDBModel>('ChannelConnection', channelConnectionSchema);
