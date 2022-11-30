import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';
import * as mongooseDelete from 'mongoose-delete';
import { schemaOptions } from '../schema-default.options';
import { NotificationTemplateEntity } from './notification-template.entity';

const notificationTemplateSchema = new Schema(
  {
    name: Schema.Types.String,
    description: Schema.Types.String,
    active: {
      type: Schema.Types.Boolean,
      default: false,
    },
    draft: {
      type: Schema.Types.Boolean,
      default: true,
    },
    critical: {
      type: Schema.Types.Boolean,
      default: false,
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
        active: {
          type: Schema.Types.Boolean,
          default: true,
        },
        shouldStopOnFail: {
          type: Schema.Types.Boolean,
          default: false,
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
                value: Schema.Types.String,
                operator: Schema.Types.String,
                on: Schema.Types.String,
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
        },
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
  },
  schemaOptions
);

notificationTemplateSchema.virtual('steps.template', {
  ref: 'MessageTemplate',
  localField: 'steps._templateId',
  foreignField: '_id',
  justOne: true,
});

notificationTemplateSchema.path('steps').schema.set('toJSON', { virtuals: true });
notificationTemplateSchema.path('steps').schema.set('toObject', { virtuals: true });

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

notificationTemplateSchema.plugin(mongooseDelete, { deletedAt: true, deletedBy: true, overrideMethods: 'all' });

interface INotificationTemplateDocument extends NotificationTemplateEntity, Document {
  _id: never;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const NotificationTemplate =
  mongoose.models.NotificationTemplate ||
  mongoose.model<INotificationTemplateDocument>('NotificationTemplate', notificationTemplateSchema);
