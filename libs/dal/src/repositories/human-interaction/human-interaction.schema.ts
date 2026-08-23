import { HumanInteractionKindEnum, HumanInteractionStatusEnum } from '@novu/shared';
import mongoose, { Schema } from 'mongoose';
import { schemaOptions } from '../schema-default.options';
import { HumanInteractionDBModel } from './human-interaction.entity';

const humanInteractionSchema = new Schema<HumanInteractionDBModel>(
  {
    identifier: {
      type: Schema.Types.String,
      required: true,
    },
    kind: {
      type: Schema.Types.String,
      enum: Object.values(HumanInteractionKindEnum),
      required: true,
    },
    status: {
      type: Schema.Types.String,
      enum: Object.values(HumanInteractionStatusEnum),
      default: HumanInteractionStatusEnum.PENDING,
      required: true,
    },
    prompt: {
      type: Schema.Types.String,
      required: true,
    },
    options: {
      type: [
        new Schema(
          {
            id: { type: Schema.Types.String, required: true },
            label: { type: Schema.Types.String, required: true },
          },
          { _id: false }
        ),
      ],
      default: undefined,
    },
    fromLabel: {
      type: Schema.Types.String,
    },
    subscriberId: {
      type: Schema.Types.String,
      required: true,
    },
    _agentId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    integrationIdentifier: {
      type: Schema.Types.String,
      required: true,
    },
    platform: {
      type: Schema.Types.String,
      required: true,
    },
    platformThreadId: {
      type: Schema.Types.String,
    },
    platformMessageId: {
      type: Schema.Types.String,
    },
    _conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
    },
    response: {
      type: new Schema(
        {
          type: { type: Schema.Types.String, required: true },
          text: { type: Schema.Types.String },
          optionId: { type: Schema.Types.String },
          respondedBy: { type: Schema.Types.String },
          respondedAt: { type: Schema.Types.String, required: true },
        },
        { _id: false }
      ),
    },
    expiresAt: {
      type: Schema.Types.String,
      required: true,
    },
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
  },
  schemaOptions
);

humanInteractionSchema.index({ _environmentId: 1, identifier: 1 }, { unique: true });
// Pending-cap counts + "most recent pending ask" bare-reply correlation.
humanInteractionSchema.index({ _environmentId: 1, subscriberId: 1, status: 1, createdAt: -1 });
// Exact reply-to correlation by delivered card message id.
humanInteractionSchema.index({ _environmentId: 1, platformMessageId: 1 });
// Expiry sweeps (lazy today, proactive later).
humanInteractionSchema.index({ status: 1, expiresAt: 1 });

export const HumanInteraction =
  (mongoose.models.HumanInteraction as mongoose.Model<HumanInteractionDBModel>) ||
  mongoose.model<HumanInteractionDBModel>('HumanInteraction', humanInteractionSchema);
