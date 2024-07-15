import mongoose from 'mongoose';
import { Schema } from 'mongoose';
import { ChangePropsValueType } from '../../types';
import { schemaOptions } from '../schema-default.options';
const mongooseDelete = require('mongoose-delete');
import { ControlVariablesEntity } from './controlVariables.entity';

export type ControlVariablesModel = ChangePropsValueType<
  ControlVariablesEntity,
  '_environmentId' | '_organizationId' | '_workflowId'
>;

const controlVariablesSchema = new Schema<ControlVariablesModel>(
  {
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
      index: true,
    },
    _stepId: {
      index: true,
      type: Schema.Types.ObjectId,
    } as any,
    workflowId: Schema.Types.String,
    stepId: Schema.Types.String,
    level: Schema.Types.String,
    priority: Schema.Types.Number,
    inputs: Schema.Types.Mixed,
    controls: Schema.Types.Mixed,
  },
  schemaOptions
);

controlVariablesSchema.plugin(mongooseDelete, { deletedAt: true, deletedBy: true, overrideMethods: 'all' });

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ControlVariables =
  (mongoose.models.ControlVariables as mongoose.Model<ControlVariablesModel>) ||
  mongoose.model<ControlVariablesModel>('controls', controlVariablesSchema) ||
  mongoose.model<ControlVariablesModel>('inputs', controlVariablesSchema);
