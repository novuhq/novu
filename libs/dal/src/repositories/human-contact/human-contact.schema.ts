import { HumanChannelViaEnum } from '@novu/shared';
import mongoose, { Schema } from 'mongoose';
import { schemaOptions } from '../schema-default.options';
import { HumanContactDBModel } from './human-contact.entity';

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
    isOperator: {
      type: Schema.Types.Boolean,
    },
  },
  schemaOptions
);

humanContactSchema.index({ _environmentId: 1, _agentId: 1, subscriberId: 1 }, { unique: true });
// One operator per relay agent.
humanContactSchema.index(
  { _environmentId: 1, _agentId: 1 },
  { unique: true, partialFilterExpression: { isOperator: true } }
);

export const HumanContact =
  (mongoose.models.HumanContact as mongoose.Model<HumanContactDBModel>) ||
  mongoose.model<HumanContactDBModel>('HumanContact', humanContactSchema);
