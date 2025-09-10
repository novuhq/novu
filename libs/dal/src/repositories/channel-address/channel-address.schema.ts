import { ADDRESS_TYPES } from '@novu/shared';
import mongoose, { Schema } from 'mongoose';
import { schemaOptions } from '../schema-default.options';
import { ChannelAddressDBModel } from './channel-address.entity';

const channelAddressSchema = new Schema<ChannelAddressDBModel>(
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
    resource: {
      type: Schema.Types.String,
      required: true,
    },
    type: {
      type: Schema.Types.String,
      enum: Object.values(ADDRESS_TYPES),
      required: true,
    },
    address: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  schemaOptions
);

channelAddressSchema.index(
  {
    _environmentId: 1,
    identifier: 1,
  },
  {
    unique: true,
  }
);

export const ChannelAddress =
  (mongoose.models.ChannelAddress as mongoose.Model<ChannelAddressDBModel>) ||
  mongoose.model<ChannelAddressDBModel>('ChannelAddress', channelAddressSchema);
