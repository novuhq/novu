import mongoose, { Schema } from 'mongoose';
import { schemaOptions } from '../schema-default.options';
import {
  ConversationActivationDBModel,
  ConversationActivationReasonEnum,
  ConversationThreadKindEnum,
} from './conversation-activation.entity';

const conversationActivationSchema = new Schema<ConversationActivationDBModel>(
  {
    _conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    _agentId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    platform: {
      type: Schema.Types.String,
      required: true,
    },
    threadKind: {
      type: Schema.Types.String,
      enum: Object.values(ConversationThreadKindEnum),
      required: true,
    },
    reason: {
      type: Schema.Types.String,
      enum: Object.values(ConversationActivationReasonEnum),
      required: true,
    },
    periodKey: {
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

// Primary read pattern: count activations for an organization in a billing period.
conversationActivationSchema.index({ _organizationId: 1, periodKey: 1 });
// Per-environment usage breakdowns and conversation-scoped lookups.
conversationActivationSchema.index({ _environmentId: 1, periodKey: 1 });
conversationActivationSchema.index({ _conversationId: 1, createdAt: 1 });

export const ConversationActivation =
  (mongoose.models.ConversationActivation as mongoose.Model<ConversationActivationDBModel>) ||
  mongoose.model<ConversationActivationDBModel>('ConversationActivation', conversationActivationSchema);
