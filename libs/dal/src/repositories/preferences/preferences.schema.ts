import mongoose from 'mongoose';
import { Schema } from 'mongoose';
const mongooseDelete = require('mongoose-delete');

import { schemaOptions } from '../schema-default.options';
import { PreferencesDBModel } from './preferences.entity';

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
    actor: Schema.Types.String,
    preferences: {
      workflow: {
        defaultValue: {
          type: Schema.Types.Boolean,
          default: true,
        },
        readOnly: {
          type: Schema.Types.Boolean,
          default: false,
        },
      },
      channels: {
        email: {
          defaultValue: {
            type: Schema.Types.Boolean,
            default: true,
          },
          readOnly: {
            type: Schema.Types.Boolean,
            default: false,
          },
        },
        sms: {
          defaultValue: {
            type: Schema.Types.Boolean,
            default: true,
          },
          readOnly: {
            type: Schema.Types.Boolean,
            default: false,
          },
        },
        in_app: {
          defaultValue: {
            type: Schema.Types.Boolean,
            default: true,
          },
          readOnly: {
            type: Schema.Types.Boolean,
            default: false,
          },
        },
        chat: {
          defaultValue: {
            type: Schema.Types.Boolean,
            default: true,
          },
          readOnly: {
            type: Schema.Types.Boolean,
            default: false,
          },
        },
        push: {
          defaultValue: {
            type: Schema.Types.Boolean,
            default: true,
          },
          readOnly: {
            type: Schema.Types.Boolean,
            default: false,
          },
        },
      },
    },
  },
  { ...schemaOptions, minimize: false }
);

preferencesSchema.plugin(mongooseDelete, { deletedAt: true, deletedBy: true, overrideMethods: 'all' });

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Preferences =
  (mongoose.models.Preferences as mongoose.Model<PreferencesDBModel>) ||
  mongoose.model<PreferencesDBModel>('Preferences', preferencesSchema);
