import mongoose, { Schema } from 'mongoose';

import { schemaOptions } from '../schema-default.options';
import { SigningSecretDBModel, SigningSecretStatusEnum } from './signing-secret.entity';

const signingSecretSchema = new Schema<SigningSecretDBModel>(
  {
    type: {
      type: Schema.Types.String,
      enum: ['subscriber', 'bridge'],
      required: true,
    },
    secret: {
      type: Schema.Types.String,
      required: true,
    },
    status: {
      type: Schema.Types.String,
      enum: Object.values(SigningSecretStatusEnum),
      default: SigningSecretStatusEnum.ACTIVE,
    },
    expiresAt: Schema.Types.Date,
    revokedAt: Schema.Types.Date,
    _environmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
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

signingSecretSchema.index({ _environmentId: 1, type: 1, status: 1 });
signingSecretSchema.index({ _organizationId: 1, _environmentId: 1 });

export const SigningSecret =
  (mongoose.models.SigningSecret as mongoose.Model<SigningSecretDBModel>) ||
  mongoose.model<SigningSecretDBModel>('SigningSecret', signingSecretSchema);
