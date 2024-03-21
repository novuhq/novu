import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';
import * as mongooseDelete from 'mongoose-delete';

import { schemaOptions } from '../schema-default.options';
import { NotificationTemplateDBModel } from './notification-template.entity';

const variantSchemePart = {
  active: {
    type: Schema.Types.Boolean,
    default: true,
  },
  replyCallback: {
    active: Schema.Types.Boolean,
    url: Schema.Types.String,
  },
  shouldStopOnFail: {
    type: Schema.Types.Boolean,
    default: false,
  },
  uuid: Schema.Types.String,
  stepId: Schema.Types.String,
  name: Schema.Types.String,
  type: {
    type: Schema.Types.String,
    default: 'REGULAR',
  },
  filters: [
    {
      isNegated: Schema.Types.Boolean,
      type: {
        type: Schema.Types.String,
      },
      value: Schema.Types.String,
      children: [
        {
          field: Schema.Types.String,
          value: Schema.Types.Mixed,
          operator: Schema.Types.String,
          on: Schema.Types.String,
          webhookUrl: Schema.Types.String,
          timeOperator: Schema.Types.String,
          step: Schema.Types.String,
          stepType: Schema.Types.String,
        },
      ],
    },
  ],
  _templateId: {
    type: Schema.Types.ObjectId,
    ref: 'MessageTemplate',
  },
  _parentId: {
    type: Schema.Types.ObjectId,
  },
  metadata: {
    amount: {
      type: Schema.Types.Number,
    },
    unit: {
      type: Schema.Types.String,
    },
    digestKey: {
      type: Schema.Types.String,
    },
    delayPath: {
      type: Schema.Types.String,
    },
    type: {
      type: Schema.Types.String,
    },
    backoffUnit: {
      type: Schema.Types.String,
    },
    backoffAmount: {
      type: Schema.Types.Number,
    },
    updateMode: {
      type: Schema.Types.Boolean,
    },
    backoff: {
      type: Schema.Types.Boolean,
    },
    timed: {
      atTime: {
        type: Schema.Types.String,
      },
      weekDays: [Schema.Types.String],
      monthDays: [Schema.Types.Number],
      ordinal: {
        type: Schema.Types.String,
      },
      ordinalValue: {
        type: Schema.Types.String,
      },
      monthlyType: {
        type: Schema.Types.String,
      },
    },
  },
};

const notificationTemplateSchema = new Schema<NotificationTemplateDBModel>(
  {
    name: Schema.Types.String,
    description: Schema.Types.String,
    active: {
      type: Schema.Types.Boolean,
      default: false,
    },
    type: {
      type: Schema.Types.String,
      default: 'REGULAR',
    },
    draft: {
      type: Schema.Types.Boolean,
      default: true,
    },
    critical: {
      type: Schema.Types.Boolean,
      default: false,
    },
    isBlueprint: {
      type: Schema.Types.Boolean,
      default: false,
    },
    blueprintId: {
      type: Schema.Types.String,
    },
    _notificationGroupId: {
      type: Schema.Types.ObjectId,
      ref: 'NotificationGroup',
    },
    tags: [Schema.Types.String],
    triggers: [
      {
        type: {
          type: Schema.Types.String,
        },
        identifier: Schema.Types.String,
        variables: [
          {
            name: Schema.Types.String,
            type: {
              type: Schema.Types.String,
            },
          },
        ],
        reservedVariables: [
          {
            type: {
              type: Schema.Types.String,
            },
            variables: [
              {
                name: Schema.Types.String,
                type: {
                  type: Schema.Types.String,
                },
              },
            ],
          },
        ],
        subscriberVariables: [
          {
            name: Schema.Types.String,
          },
        ],
      },
    ],
    steps: [
      {
        ...variantSchemePart,
        variants: [variantSchemePart],
      },
    ],
    preferenceSettings: {
      email: {
        type: Schema.Types.Boolean,
        default: true,
      },
      sms: {
        type: Schema.Types.Boolean,
        default: true,
      },
      in_app: {
        type: Schema.Types.Boolean,
        default: true,
      },
      chat: {
        type: Schema.Types.Boolean,
        default: true,
      },
      push: {
        type: Schema.Types.Boolean,
        default: true,
      },
    },
    _environmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
    },
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    _creatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    _parentId: {
      type: Schema.Types.ObjectId,
      ref: 'NotificationTemplate',
    },
    data: Schema.Types.Mixed,
    rawData: Schema.Types.Mixed,
    payloadSchema: Schema.Types.Mixed,
  },
  schemaOptions
);

notificationTemplateSchema.virtual('steps.template', {
  ref: 'MessageTemplate',
  localField: 'steps._templateId',
  foreignField: '_id',
  justOne: true,
});

notificationTemplateSchema.virtual('steps.variants.template', {
  ref: 'MessageTemplate',
  localField: 'steps.variants._templateId',
  foreignField: '_id',
  justOne: true,
});

notificationTemplateSchema.path('steps').schema.set('toJSON', { virtuals: true });
notificationTemplateSchema.path('steps').schema.set('toObject', { virtuals: true });

notificationTemplateSchema.path('steps.variants').schema.set('toJSON', { virtuals: true });
notificationTemplateSchema.path('steps.variants').schema.set('toObject', { virtuals: true });

notificationTemplateSchema.virtual('notificationGroup', {
  ref: 'NotificationGroup',
  localField: '_notificationGroupId',
  foreignField: '_id',
  justOne: true,
});

notificationTemplateSchema.index({
  _organizationId: 1,
  'triggers.identifier': 1,
});

notificationTemplateSchema.index({
  _environmentId: 1,
  name: 1,
});

notificationTemplateSchema.index({
  _environmentId: 1,
  'triggers.identifier': 1,
  name: 1,
});

notificationTemplateSchema.plugin(mongooseDelete, { deletedAt: true, deletedBy: true, overrideMethods: 'all' });

// eslint-disable-next-line @typescript-eslint/naming-convention
export const NotificationTemplate =
  (mongoose.models.NotificationTemplate as mongoose.Model<NotificationTemplateDBModel>) ||
  mongoose.model<NotificationTemplateDBModel>('NotificationTemplate', notificationTemplateSchema);
