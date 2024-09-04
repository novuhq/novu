import mongoose, { Schema } from 'mongoose';
import { schemaOptions } from '../schema-default.options';
import { PreferencesDBModel } from './preferences.entity';
import { ChannelTypeEnum } from '@novu/shared';

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
        [ChannelTypeEnum.EMAIL]: {
          defaultValue: {
            type: Schema.Types.Boolean,
            default: true,
          },
          readOnly: {
            type: Schema.Types.Boolean,
            default: false,
          },
        },
        [ChannelTypeEnum.SMS]: {
          defaultValue: {
            type: Schema.Types.Boolean,
            default: true,
          },
          readOnly: {
            type: Schema.Types.Boolean,
            default: false,
          },
        },
        [ChannelTypeEnum.IN_APP]: {
          defaultValue: {
            type: Schema.Types.Boolean,
            default: true,
          },
          readOnly: {
            type: Schema.Types.Boolean,
            default: false,
          },
        },
        [ChannelTypeEnum.CHAT]: {
          defaultValue: {
            type: Schema.Types.Boolean,
            default: true,
          },
          readOnly: {
            type: Schema.Types.Boolean,
            default: false,
          },
        },
        [ChannelTypeEnum.PUSH]: {
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

export const Preferences =
  (mongoose.models.Preferences as mongoose.Model<PreferencesDBModel>) ||
  mongoose.model<PreferencesDBModel>('Preferences', preferencesSchema);
