import { ChannelTypeEnum, PreferencesTypeEnum } from '@novu/shared';
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
    _topicSubscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'TopicSubscribers',
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
        condition: {
          type: Schema.Types.Mixed,
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

preferencesSchema.plugin(mongooseDelete, {
  deletedAt: true,
  deletedBy: true,
  overrideMethods: 'all',
  use$neOperator: false,
});

// Subscriber Global Preferences
// Ensures one global preference per subscriber (SUBSCRIBER_GLOBAL type)
// Partial filter ensures this only applies to SUBSCRIBER_GLOBAL type,
// preventing conflicts with other preference types
preferencesSchema.index(
  {
    _environmentId: 1,
    _subscriberId: 1,
    type: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      type: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
    },
  }
);

// Subscriber Workflow Preferences
// Ensures one workflow preference per subscriber per template (SUBSCRIBER_WORKFLOW type)
// Partial filter ensures this only applies to SUBSCRIBER_WORKFLOW type,
// preventing conflicts with other preference types
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
      type: PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
    },
  }
);

// Workflow Preferences (both Resource and User)
// Ensures one workflow-level preference per template per type (USER_WORKFLOW, WORKFLOW_RESOURCE)
// Partial filter ensures this only applies to USER_WORKFLOW and WORKFLOW_RESOURCE types,
// preventing conflicts with subscriber-specific preferences
preferencesSchema.index(
  {
    _environmentId: 1,
    _templateId: 1,
    type: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      type: { $in: [PreferencesTypeEnum.USER_WORKFLOW, PreferencesTypeEnum.WORKFLOW_RESOURCE] },
    },
  }
);

// Ensures one workflow preference per subscriber per template per topic subscription (SUBSCRIPTION_SUBSCRIBER_WORKFLOW type)
// Only for this type (via partial filter).
preferencesSchema.index(
  {
    _environmentId: 1,
    _subscriberId: 1,
    _topicSubscriptionId: 1,
    _templateId: 1,
    type: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      type: PreferencesTypeEnum.SUBSCRIPTION_SUBSCRIBER_WORKFLOW,
    },
  }
);

preferencesSchema.index({
  _environmentId: 1,
  _organizationId: 1,
  _subscriberId: 1,
  _templateId: 1,
  type: 1,
  deleted: 1,
});

preferencesSchema.index({
  _environmentId: 1,
  _organizationId: 1,
  _subscriberId: 1,
  type: 1,
  deleted: 1,
});

preferencesSchema.index({
  _environmentId: 1,
  _organizationId: 1,
  _templateId: 1,
  type: 1,
  deleted: 1,
});

export const Preferences =
  (mongoose.models.Preferences as mongoose.Model<PreferencesDBModel>) ||
  mongoose.model<PreferencesDBModel>('Preferences', preferencesSchema);
