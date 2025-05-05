import { ApiRateLimitCategoryEnum } from '@novu/shared';
import mongoose, { Schema } from 'mongoose';

import { schemaOptions } from '../schema-default.options';
import { EnvironmentDBModel } from './environment.entity';

const environmentSchema = new Schema<EnvironmentDBModel>(
  {
    name: Schema.Types.String,
    identifier: {
      type: Schema.Types.String,
      unique: true,
    },
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    apiKeys: [
      {
        key: {
          type: Schema.Types.String,
          unique: true,
        },
        hash: Schema.Types.String,
        _userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],
    apiRateLimits: {
      [ApiRateLimitCategoryEnum.TRIGGER]: Schema.Types.Number,
      [ApiRateLimitCategoryEnum.CONFIGURATION]: Schema.Types.Number,
      [ApiRateLimitCategoryEnum.GLOBAL]: Schema.Types.Number,
    },
    widget: {
      notificationCenterEncryption: {
        type: Schema.Types.Boolean,
        default: false,
      },
    },
    dns: {
      mxRecordConfigured: {
        type: Schema.Types.Boolean,
      },
      inboundParseDomain: {
        type: Schema.Types.String,
      },
    },
    echo: {
      url: Schema.Types.String,
    },
    bridge: {
      url: Schema.Types.String,
    },
    _parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
    },
    color: Schema.Types.String,
  },
  schemaOptions
);

/*
 * Path: ./get-platform-notification-usage.usecase.ts
 *    Context: execute()
 *        Query: organizationRepository.aggregate(
 *                $lookup:
 *        {
 *          from: 'environments',
 *          localField: '_id',
 *          foreignField: '_organizationId',
 *          as: 'environments',
 *        }
 */
environmentSchema.index({
  _organizationId: 1,
});

environmentSchema.index({
  'apiKeys.hash': 1,
});

environmentSchema.index(
  {
    identifier: 1,
  },
  { unique: true }
);

environmentSchema.index(
  {
    'apiKeys.key': 1,
  },
  {
    unique: true,
  }
);

export const Environment =
  (mongoose.models.Environment as mongoose.Model<EnvironmentDBModel>) ||
  mongoose.model<EnvironmentDBModel>('Environment', environmentSchema);
