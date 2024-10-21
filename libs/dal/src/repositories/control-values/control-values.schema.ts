import mongoose, { Schema } from 'mongoose';
import { ChangePropsValueType } from '../../types';
import { schemaOptions } from '../schema-default.options';
import { ControlValuesEntity } from './control-values.entity';

const mongooseDelete = require('mongoose-delete');

export type ControlValuesModel = ChangePropsValueType<
  ControlValuesEntity,
  '_environmentId' | '_organizationId' | '_workflowId'
>;

const controlValuesSchema = new Schema<ControlValuesModel>(
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
    level: Schema.Types.String,
    priority: Schema.Types.Number,
    inputs: Schema.Types.Mixed,
    controls: Schema.Types.Mixed,
  },
  schemaOptions
);

controlValuesSchema.plugin(mongooseDelete, { deletedAt: true, deletedBy: true, overrideMethods: 'all' });

export const ControlValues =
  (mongoose.models.ControlValues as mongoose.Model<ControlValuesModel>) ||
  mongoose.model<ControlValuesModel>('controls', controlValuesSchema) ||
  mongoose.model<ControlValuesModel>('inputs', controlValuesSchema);
