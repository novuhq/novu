import mongoose, { Schema } from 'mongoose';
import { schemaOptions } from '../schema-default.options';
import { ConversationDBModel, ConversationParticipantTypeEnum, ConversationStatusEnum } from './conversation.entity';

const conversationSchema = new Schema<ConversationDBModel>(
  {
    identifier: {
      type: Schema.Types.String,
      required: true,
    },
    _agentId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    participants: {
      type: [
        new Schema(
          {
            type: {
              type: Schema.Types.String,
              enum: Object.values(ConversationParticipantTypeEnum),
              required: true,
            },
            id: {
              type: Schema.Types.String,
              required: true,
            },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    channels: {
      type: [
        new Schema(
          {
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
            serializedThread: {
              type: Schema.Types.Mixed,
            },
            firstPlatformMessageId: {
              type: Schema.Types.String,
            },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    status: {
      type: Schema.Types.String,
      enum: Object.values(ConversationStatusEnum),
      default: ConversationStatusEnum.ACTIVE,
      required: true,
    },
    title: {
      type: Schema.Types.String,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    messageCount: {
      type: Schema.Types.Number,
      default: 0,
    },
    lastMessagePreview: {
      type: Schema.Types.String,
    },
    lastActivityAt: {
      type: Schema.Types.String,
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

conversationSchema.index({ _environmentId: 1, identifier: 1 }, { unique: true });
conversationSchema.index({ _environmentId: 1, 'channels.platformThreadId': 1 });
conversationSchema.index({ _environmentId: 1, 'participants.id': 1, status: 1 });
conversationSchema.index({ _environmentId: 1, _agentId: 1, _id: 1 });
conversationSchema.index({ _environmentId: 1, _agentId: 1, createdAt: 1 });
conversationSchema.index({ _environmentId: 1, _agentId: 1, lastActivityAt: 1 });

export const Conversation =
  (mongoose.models.Conversation as mongoose.Model<ConversationDBModel>) ||
  mongoose.model<ConversationDBModel>('Conversation', conversationSchema);
