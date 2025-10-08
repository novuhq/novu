import { ChannelTypeEnum } from '@novu/shared';
import mongoose, { Schema } from 'mongoose';
import { schemaOptions } from '../schema-default.options';
import { PreferencesDBModel } from './preferences.entity';

const mongooseDelete = require('mongoose-delete');

const preferencesSchema = new Schema<PreferencesDBModel>(
  {
    _environmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
    },
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    _subscriberId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscriber',
    },
    _userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    _templateId: {
      type: Schema.Types.ObjectId,
      ref: 'NotificationTemplate',
    },
    type: Schema.Types.String,
    preferences: {
      all: {
        enabled: {
          type: Schema.Types.Boolean,
        },
        readOnly: {
          type: Schema.Types.Boolean,
        },
      },
      channels: {
        [ChannelTypeEnum.EMAIL]: {
          enabled: {
            type: Schema.Types.Boolean,
          },
        },
        [ChannelTypeEnum.SMS]: {
          enabled: {
            type: Schema.Types.Boolean,
          },
        },
        [ChannelTypeEnum.IN_APP]: {
          enabled: {
            type: Schema.Types.Boolean,
          },
        },
        [ChannelTypeEnum.CHAT]: {
          enabled: {
            type: Schema.Types.Boolean,
          },
        },
        [ChannelTypeEnum.PUSH]: {
          enabled: {
            type: Schema.Types.Boolean,
          },
        },
      },
    },
    schedule: Schema.Types.Mixed,
  },
  { ...schemaOptions, minimize: false }
);

preferencesSchema.plugin(mongooseDelete, { deletedAt: true, deletedBy: true, overrideMethods: 'all' });

// Subscriber Global Preferences
// Ensures one global preference per subscriber per type (e.g., SUBSCRIBER_GLOBAL)
// Partial filter ensures this only applies when _subscriberId exists and _templateId doesn't,
// preventing conflicts with subscriber workflow preferences (which have both fields)
preferencesSchema.index(
  {
    _environmentId: 1,
    _subscriberId: 1,
    type: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      _templateId: { $exists: false },
      _subscriberId: { $exists: true },
    },
  }
);

// Subscriber Workflow Preferences
// Ensures one workflow preference per subscriber per template (e.g., SUBSCRIBER_WORKFLOW)
// Partial filter ensures this only applies when both _subscriberId and _templateId exist,
// preventing conflicts with global subscriber preferences and workflow-level preferences
preferencesSchema.index(
  {
    _environmentId: 1,
    _subscriberId: 1,
    _templateId: 1,
    type: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      _subscriberId: { $exists: true },
      _templateId: { $exists: true },
    },
  }
);

// Workflow Preferences (both Resource and User)
// Ensures one workflow-level preference per template per type (e.g., USER_WORKFLOW, WORKFLOW_RESOURCE)
// Partial filter ensures this only applies when _templateId exists and _subscriberId doesn't,
// preventing conflicts with subscriber workflow preferences (which have both fields)
preferencesSchema.index(
  {
    _environmentId: 1,
    _templateId: 1,
    type: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      _subscriberId: { $exists: false },
      _templateId: { $exists: true },
    },
  }
);

export const Preferences =
  (mongoose.models.Preferences as mongoose.Model<PreferencesDBModel>) ||
  mongoose.model<PreferencesDBModel>('Preferences', preferencesSchema);
