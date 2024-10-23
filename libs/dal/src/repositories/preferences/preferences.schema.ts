import mongoose, { Schema } from 'mongoose';
import { ChannelTypeEnum } from '@novu/shared';
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
  },
  { ...schemaOptions, minimize: false }
);

preferencesSchema.plugin(mongooseDelete, { deletedAt: true, deletedBy: true, overrideMethods: 'all' });

export const Preferences =
  (mongoose.models.Preferences as mongoose.Model<PreferencesDBModel>) ||
  mongoose.model<PreferencesDBModel>('Preferences', preferencesSchema);
