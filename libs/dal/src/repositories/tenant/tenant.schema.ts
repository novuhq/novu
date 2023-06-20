import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';

import { schemaOptions } from '../schema-default.options';
import { TenantDBModel } from './tenant.entity';

const tenantSchema = new Schema<TenantDBModel>(
  {
    identifier: Schema.Types.String,
    name: Schema.Types.String,
    deleted: Schema.Types.Boolean,
    data: Schema.Types.Mixed,
    _environmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
    },
  },
  schemaOptions
);

tenantSchema.index({
  _environmentId: 1,
});

/*
 * This index was initially created to optimize:
 *
 * Path: apps/api/src/app/tenant/usecases/create-tenant/create-tenant.usecase.ts
 * Context: execute()
 * Query: findOne({
 *    _environmentId: command.environmentId,
 *    identifier: command.identifier,
 *  });
 */
tenantSchema.index({
  identifier: 1,
  _environmentId: 1,
});

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Tenant =
  (mongoose.models.Tenant as mongoose.Model<TenantDBModel>) || mongoose.model<TenantDBModel>('Tenant', tenantSchema);
