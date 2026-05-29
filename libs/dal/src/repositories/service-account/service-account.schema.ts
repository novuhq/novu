import mongoose, { Schema } from 'mongoose';

import { schemaOptions } from '../schema-default.options';
import { ServiceAccountDBModel } from './service-account.entity';

const serviceAccountSchema = new Schema<ServiceAccountDBModel>(
  {
    name: {
      type: Schema.Types.String,
      required: true,
    },
    scope: {
      type: Schema.Types.String,
      enum: ['environment', 'organization'],
      required: true,
    },
    _environmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
    },
    defaultPermissions: {
      type: [Schema.Types.String],
      required: true,
    },
    _createdByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    metadata: Schema.Types.Mixed,
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
  },
  schemaOptions
);

serviceAccountSchema.index({ _organizationId: 1 });
serviceAccountSchema.index({ _organizationId: 1, scope: 1 });
serviceAccountSchema.index({ _organizationId: 1, _environmentId: 1 }, { sparse: true });

export const ServiceAccount =
  (mongoose.models.ServiceAccount as mongoose.Model<ServiceAccountDBModel>) ||
  mongoose.model<ServiceAccountDBModel>('ServiceAccount', serviceAccountSchema);
