import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';

import { schemaOptions } from '../schema-default.options';
import { TenantDBModel } from './tenant.entity';

const tenantSchema = new Schema<TenantDBModel>(
  {
    identifier: Schema.Types.String,
    name: Schema.Types.String,
    deleted: Schema.Types.Boolean,
    createdAt: Schema.Types.String,
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

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Tenant =
  (mongoose.models.Tenant as mongoose.Model<TenantDBModel>) || mongoose.model<TenantDBModel>('Tenant', tenantSchema);
