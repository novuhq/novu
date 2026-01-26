import { ChannelTypeEnum, PreferencesTypeEnum } from '@novu/shared';
import { createHash } from 'crypto';
import mongoose, { Schema, UpdateQuery } from 'mongoose';
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
    contextKeys: {
      type: [Schema.Types.String],
      default: undefined,
    },
    contextKeysHash: {
      type: Schema.Types.String,
      default: undefined,
    },
  },
  { ...schemaOptions, minimize: false }
);

preferencesSchema.plugin(mongooseDelete, {
  deletedAt: true,
  deletedBy: true,
  overrideMethods: 'all',
  use$neOperator: false,
});

preferencesSchema.pre('save', function (next) {
  // Generate a hash from contextKeys to enforce uniqueness, since MongoDB cannot create unique indexes directly on arrays the way we need.
  // See: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-multikey/#unique-multikey-indexes
  // The hash ensures each unique combination of contextKeys is properly indexed.
  if (this.contextKeys && this.contextKeys.length > 0) {
    const sorted = [...this.contextKeys].sort();
    this.contextKeysHash = createHash('sha256').update(JSON.stringify(sorted)).digest('hex').substring(0, 16);
  } else {
    this.contextKeysHash = undefined;
  }
  next();
});

// Subscriber Global Preferences
// Ensures one global preference per subscriber per context (SUBSCRIBER_GLOBAL type)
// Includes contextKeysHash to allow multiple preferences for different contexts
// Partial filter ensures this only applies to SUBSCRIBER_GLOBAL type,
// preventing conflicts with other preference types
preferencesSchema.index(
  {
    _environmentId: 1,
    _subscriberId: 1,
    type: 1,
    contextKeysHash: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      type: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
    },
  }
);

// Subscriber Workflow Preferences
// Ensures one workflow preference per subscriber per template per context (SUBSCRIBER_WORKFLOW type)
// Includes contextKeysHash to allow multiple preferences for different contexts
// Partial filter ensures this only applies to SUBSCRIBER_WORKFLOW type,
// preventing conflicts with other preference types
preferencesSchema.index(
  {
    _environmentId: 1,
    _subscriberId: 1,
    _templateId: 1,
    type: 1,
    contextKeysHash: 1,
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

// Ensures one workflow preference per subscriber per template per topic subscription per context (SUBSCRIPTION_SUBSCRIBER_WORKFLOW type)
// Includes contextKeysHash to allow multiple preferences for different contexts
// Only for this type (via partial filter).
preferencesSchema.index(
  {
    _environmentId: 1,
    _subscriberId: 1,
    _topicSubscriptionId: 1,
    _templateId: 1,
    type: 1,
    contextKeysHash: 1,
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
