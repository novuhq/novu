import mongoose, { Schema } from 'mongoose';
import { schemaOptions } from '../schema-default.options';
import {
  ConversationActivityDBModel,
  ConversationActivitySenderTypeEnum,
  ConversationActivityTypeEnum,
} from './conversation-activity.entity';

const conversationActivitySchema = new Schema<ConversationActivityDBModel>(
  {
    identifier: {
      type: Schema.Types.String,
      required: true,
    },
    _conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    type: {
      type: Schema.Types.String,
      enum: Object.values(ConversationActivityTypeEnum),
      default: ConversationActivityTypeEnum.MESSAGE,
    },
    content: {
      type: Schema.Types.String,
      required: true,
    },
    platform: {
      type: Schema.Types.String,
      required: true,
    },
    _integrationId: {
      type: Schema.Types.ObjectId,
      ref: 'Integration',
      required: true,
    },
    platformThreadId: {
      type: Schema.Types.String,
      required: true,
    },
    senderType: {
      type: Schema.Types.String,
      enum: Object.values(ConversationActivitySenderTypeEnum),
      required: true,
    },
    senderId: {
      type: Schema.Types.String,
      required: true,
    },
    platformMessageId: {
      type: Schema.Types.String,
    },
    senderName: {
      type: Schema.Types.String,
    },
    richContent: {
      type: Schema.Types.Mixed,
    },
    signalData: {
      type: Schema.Types.Mixed,
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

conversationActivitySchema.index({ _conversationId: 1, createdAt: 1 });
conversationActivitySchema.index({ _conversationId: 1, platformMessageId: 1 }, { sparse: true });
conversationActivitySchema.index({ _environmentId: 1, identifier: 1 }, { unique: true });

export const ConversationActivity =
  (mongoose.models.ConversationActivity as mongoose.Model<ConversationActivityDBModel>) ||
  mongoose.model<ConversationActivityDBModel>('ConversationActivity', conversationActivitySchema);
