import mongoose, { Schema } from 'mongoose';

import { schemaOptions } from '../schema-default.options';
import { ApiKeyCredentialDBModel } from './api-key-credential.entity';

const apiKeyCredentialSchema = new Schema<ApiKeyCredentialDBModel>(
  {
    hash: {
      type: Schema.Types.String,
      required: true,
      unique: true,
    },
    keyPrefix: {
      type: Schema.Types.String,
      required: true,
    },
    last4: {
      type: Schema.Types.String,
      required: true,
    },
    name: Schema.Types.String,
    permissions: {
      type: [Schema.Types.String],
      required: true,
    },
    metadata: Schema.Types.Mixed,
    lastUsedAt: Schema.Types.Date,
    expiresAt: Schema.Types.Date,
    revokedAt: Schema.Types.Date,
    _serviceAccountId: {
      type: Schema.Types.ObjectId,
      ref: 'ServiceAccount',
      required: true,
    },
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
  },
  schemaOptions
);

apiKeyCredentialSchema.index({ _organizationId: 1 });
apiKeyCredentialSchema.index({ _serviceAccountId: 1 });
apiKeyCredentialSchema.index({ hash: 1 }, { unique: true });

export const ApiKeyCredential =
  (mongoose.models.ApiKeyCredential as mongoose.Model<ApiKeyCredentialDBModel>) ||
  mongoose.model<ApiKeyCredentialDBModel>('ApiKeyCredential', apiKeyCredentialSchema);
