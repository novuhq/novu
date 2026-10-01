import { HumanChannelViaEnum } from '@novu/shared';
import mongoose, { Schema } from 'mongoose';
import { schemaOptions } from '../schema-default.options';
import { HumanContactDBModel } from './human-contact.entity';

const humanContactPendingAddressSchema = new Schema(
  {
    address: {
      type: Schema.Types.String,
      required: true,
    },
    requestedAt: {
      type: Schema.Types.String,
      required: true,
    },
  },
  { _id: false }
);

const humanContactVerifiedAddressSchema = new Schema(
  {
    address: {
      type: Schema.Types.String,
      required: true,
    },
    requestedAt: {
      type: Schema.Types.String,
      required: true,
    },
    verifiedAt: {
      type: Schema.Types.String,
      required: true,
    },
  },
  { _id: false }
);

const humanContactChannelAddressesSchema = new Schema(
  {
    pending: {
      type: humanContactPendingAddressSchema,
    },
    verified: {
      type: humanContactVerifiedAddressSchema,
    },
  },
  { _id: false }
);

const humanContactSchema = new Schema<HumanContactDBModel>(
  {
    _environmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
      required: true,
    },
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    _agentId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    subscriberId: {
      type: Schema.Types.String,
      required: true,
    },
    defaultVia: {
      type: Schema.Types.String,
      enum: Object.values(HumanChannelViaEnum),
    },
    defaultSetBy: {
      type: Schema.Types.String,
      enum: ['inviter', 'contact'],
    },
    addresses: {
      type: new Schema(
        {
          email: {
            type: humanContactChannelAddressesSchema,
          },
        },
        { _id: false }
      ),
    },
  },
  schemaOptions
);

humanContactSchema.index({ _environmentId: 1, _agentId: 1, subscriberId: 1 }, { unique: true });

export const HumanContact =
  (mongoose.models.HumanContact as mongoose.Model<HumanContactDBModel>) ||
  mongoose.model<HumanContactDBModel>('HumanContact', humanContactSchema);
