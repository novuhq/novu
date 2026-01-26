import { ChannelTypeEnum, PreferencesTypeEnum } from '@novu/shared';
import { createHash } from 'crypto';
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

const CONTEXT_FILTERING_PREFERENCE_TYPES = [
  PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
  PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
  PreferencesTypeEnum.SUBSCRIPTION_SUBSCRIBER_WORKFLOW,
] as const;

function shouldApplyContextKeysHash(type: PreferencesTypeEnum): boolean {
  return CONTEXT_FILTERING_PREFERENCE_TYPES.includes(type as (typeof CONTEXT_FILTERING_PREFERENCE_TYPES)[number]);
}

function generateContextKeysHash(contextKeys: string[] | undefined): string {
  if (!contextKeys || contextKeys.length === 0) {
    return 'DEFAULT_CONTEXT';
  }

  const sorted = [...contextKeys].sort();

  return createHash('sha256').update(JSON.stringify(sorted)).digest('hex').substring(0, 16);
}

preferencesSchema.pre('save', function (next) {
  if (shouldApplyContextKeysHash(this.type)) {
    this.contextKeysHash = generateContextKeysHash(this.contextKeys);
  }

  next();
});

preferencesSchema.pre('insertMany', (next, docs: PreferencesDBModel[]) => {
  for (const doc of docs) {
    if (shouldApplyContextKeysHash(doc.type)) {
      doc.contextKeysHash = generateContextKeysHash(doc.contextKeys);
    }
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
      contextKeysHash: { $exists: true },
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
      contextKeysHash: { $exists: true },
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
      contextKeysHash: { $exists: true },
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
