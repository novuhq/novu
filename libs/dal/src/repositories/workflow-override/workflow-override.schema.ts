import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';
import * as mongooseDelete from 'mongoose-delete';

import { schemaOptions } from '../schema-default.options';
import { WorkflowOverrideDBModel } from './workflow-override.entity';

const workflowOverrideSchema = new Schema<WorkflowOverrideDBModel>(
  {
    active: {
      type: Schema.Types.Boolean,
      default: false,
    },
    _environmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
    },
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    _workflowId: {
      type: Schema.Types.ObjectId,
      ref: 'NotificationTemplate',
    },
    _tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
    },
    preferenceSettings: {
      email: {
        type: Schema.Types.Boolean,
        default: true,
      },
      sms: {
        type: Schema.Types.Boolean,
        default: true,
      },
      in_app: {
        type: Schema.Types.Boolean,
        default: true,
      },
      chat: {
        type: Schema.Types.Boolean,
        default: true,
      },
      push: {
        type: Schema.Types.Boolean,
        default: true,
      },
    },
  },
  schemaOptions
);

workflowOverrideSchema.virtual('workflow', {
  ref: 'NotificationTemplate',
  localField: '_workflowId',
  foreignField: '_id',
  justOne: true,
});

workflowOverrideSchema.virtual('tenant', {
  ref: 'Tenant',
  localField: '_tenantId',
  foreignField: '_id',
  justOne: true,
});

workflowOverrideSchema.plugin(mongooseDelete, { deletedAt: true, deletedBy: true, overrideMethods: 'all' });

workflowOverrideSchema.index(
  {
    _tenantId: 1,
    _workflowId: 1,
    _environmentId: 1,
  },
  { unique: true }
);

// eslint-disable-next-line @typescript-eslint/naming-convention
export const WorkflowOverride =
  (mongoose.models.WorkflowOverride as mongoose.Model<WorkflowOverrideDBModel>) ||
  mongoose.model<WorkflowOverrideDBModel>('WorkflowOverride', workflowOverrideSchema);
