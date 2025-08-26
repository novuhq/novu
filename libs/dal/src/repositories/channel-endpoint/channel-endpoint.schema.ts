import { ChatProviderIdEnum, ProvidersIdEnumConst } from '@novu/shared';
import mongoose, { Schema } from 'mongoose';
import { schemaOptions } from '../schema-default.options';
import { ChannelEndpointDBModel } from './channel-endpoint.entity';

const routingSchema = new Schema(
  {
    providerId: {
      type: String,
      required: true,
      enum: [
        ...Object.values(ProvidersIdEnumConst.EmailProviderIdEnum),
        ...Object.values(ProvidersIdEnumConst.SmsProviderIdEnum),
        ...Object.values(ProvidersIdEnumConst.PushProviderIdEnum),
        ...Object.values(ProvidersIdEnumConst.InAppProviderIdEnum),
        ...Object.values(ProvidersIdEnumConst.ChatProviderIdEnum),
      ],
    },
  },
  {
    _id: false,
    discriminatorKey: 'providerId',
  }
);

// Slack routing schema
const slackRoutingSchema = new Schema(
  {
    channelId: {
      type: String,
      required: false,
    },
    userId: {
      type: String,
      required: false,
    },
  },
  { _id: false }
);

routingSchema.discriminator(ChatProviderIdEnum.Slack, slackRoutingSchema);

const channelEndpointSchema = new Schema<ChannelEndpointDBModel>(
  {
    identifier: {
      type: Schema.Types.String,
      required: true,
    },
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    _environmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
    },
    _integrationId: {
      type: Schema.Types.ObjectId,
      ref: 'Integration',
    },
    subscriberId: Schema.Types.String,
    endpoint: Schema.Types.String,
    routing: {
      type: routingSchema,
      required: false,
    },
  },
  schemaOptions
);

channelEndpointSchema.index(
  {
    _environmentId: 1,
    identifier: 1,
  },
  {
    unique: true,
  }
);

export const ChannelEndpoint =
  (mongoose.models.ChannelEndpoint as mongoose.Model<ChannelEndpointDBModel>) ||
  mongoose.model<ChannelEndpointDBModel>('ChannelEndpoint', channelEndpointSchema);
