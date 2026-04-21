import mongoose, { Schema } from 'mongoose';

import { schemaOptions } from '../schema-default.options';
import { DomainDBModel } from './domain.entity';

const domainSchema = new Schema<DomainDBModel>(
  {
    name: {
      type: Schema.Types.String,
      required: true,
    },
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    _environmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
    },
  },
  schemaOptions
);

/*
 * Globally unique: a DNS domain name is a global resource and cannot be claimed
 * by more than one account across all environments.
 */
domainSchema.index({ name: 1 }, { unique: true });

domainSchema.index({ _environmentId: 1 });

/*
 * Supports listDomains queries scoped to a specific environment + organization.
 */
domainSchema.index({ _environmentId: 1, _organizationId: 1 });

export const Domain =
  (mongoose.models.Domain as mongoose.Model<DomainDBModel>) || mongoose.model<DomainDBModel>('Domain', domainSchema);
