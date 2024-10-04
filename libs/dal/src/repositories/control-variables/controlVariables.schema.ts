import mongoose, { Schema } from 'mongoose';
import { ChangePropsValueType } from '../../types';
import { schemaOptions } from '../schema-default.options';
import { ControlValuesEntity } from './controlValuesEntity';

const mongooseDelete = require('mongoose-delete');

export type ControlValuesModel = ChangePropsValueType<
  ControlValuesEntity,
  '_environmentId' | '_organizationId' | '_workflowId'
>;

const controlVariablesSchema = new Schema<ControlValuesModel>(
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

export const ControlVariables =
  (mongoose.models.ControlVariables as mongoose.Model<ControlValuesModel>) ||
  mongoose.model<ControlValuesModel>('controls', controlVariablesSchema) ||
  mongoose.model<ControlValuesModel>('inputs', controlVariablesSchema);
