import mongoose, { Schema } from 'mongoose';

import { schemaOptions } from '../schema-default.options';
import { TenantDBModel } from './tenant.entity';

const tenantSchema = new Schema<TenantDBModel>(
  {
    identifier: Schema.Types.String,
    name: Schema.Types.String,
    data: Schema.Types.Mixed,
    _environmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
    },
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
  },
  schemaOptions
);

/*
 * This index was initially created to optimize:
 *
 * Path: apps/api/src/app/tenant/usecases/get-tenants/get-tenants.usecase.ts
 * Context: execute()
 * Query: find(
 *    {
 *      _environmentId: command.environmentId,
 *      _organizationId: command.organizationId,
 *    },
 *    '',
 *    {
 *      limit: command.limit,
 *      skip: command.page * command.limit,
 *      sort: { createdAt: -1 },
 *    }
 *  );
 */
tenantSchema.index({
  _environmentId: 1,
  createdAt: -1,
});

export const Tenant =
  (mongoose.models.Tenant as mongoose.Model<TenantDBModel>) || mongoose.model<TenantDBModel>('Tenant', tenantSchema);
