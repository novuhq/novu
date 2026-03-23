import { AiResumeActionEnum } from '@novu/shared';
import mongoose, { Schema } from 'mongoose';
import { schemaOptions } from '../schema-default.options';
import { AiChatDBModel } from './ai-chat.entity';

const aiChatSchema = new Schema<AiChatDBModel>(
  {
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    _environmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
      index: true,
    },
    _userId: {
      type: Schema.Types.String,
      required: true,
      index: true,
    },
    resourceType: {
      type: Schema.Types.String,
      required: true,
    },
    resourceId: {
      type: Schema.Types.String,
      required: false,
    },
    messages: {
      type: Schema.Types.Mixed,
      required: false,
      default: [],
    },
    activeStreamId: {
      type: Schema.Types.String,
      required: false,
      default: null,
    },
    snapshots: {
      type: [
        {
          _snapshotId: { type: Schema.Types.String, required: true },
          messageId: { type: Schema.Types.String, required: true },
          checkpointId: { type: Schema.Types.String, required: false },
        },
      ],
      required: false,
      default: [],
    },
    resumeCheckpointId: {
      type: Schema.Types.String,
      required: false,
      default: null,
    },
    resumeAction: {
      type: Schema.Types.String,
      enum: Object.values(AiResumeActionEnum),
      required: false,
      default: null,
    },
    hasPendingChanges: {
      type: Schema.Types.Boolean,
      required: true,
      default: false,
    },
  },
  { ...schemaOptions, minimize: false }
);

aiChatSchema.index({
  _environmentId: 1,
  _organizationId: 1,
  _userId: 1,
  resourceType: 1,
  resourceId: 1,
  createdAt: -1,
});

aiChatSchema.index({
  _environmentId: 1,
  _organizationId: 1,
  updatedAt: -1,
});

export const AiChat =
  (mongoose.models.AiChat as mongoose.Model<AiChatDBModel>) || mongoose.model<AiChatDBModel>('AiChat', aiChatSchema);
