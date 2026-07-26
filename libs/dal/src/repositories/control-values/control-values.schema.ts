import mongoose, { Schema } from 'mongoose';
import { ChangePropsValueType } from '../../types';
import { schemaOptions } from '../schema-default.options';
import { ControlValuesEntity } from './control-values.entity';

const mongooseDelete = require('mongoose-delete');

export type ControlValuesModel = ChangePropsValueType<
  ControlValuesEntity,
  '_environmentId' | '_organizationId' | '_workflowId' | '_layoutId'
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
    },
    _stepId: {
      type: Schema.Types.ObjectId,
    } as any,
    _layoutId: {
      type: Schema.Types.ObjectId,
      ref: 'Layout',
    },
    level: Schema.Types.String,
    priority: Schema.Types.Number,
    controls: Schema.Types.Mixed,
    providerId: Schema.Types.String,
  },
  schemaOptions
);

controlValuesSchema.index({
  _environmentId: 1,
  _workflowId: 1,
  _stepId: 1,
  level: 1,
  providerId: 1,
});

controlValuesSchema.plugin(mongooseDelete, {
  deletedAt: true,
  deletedBy: true,
  overrideMethods: 'all',
  use$neOperator: false,
});

export const ControlValues =
  (mongoose.models.ControlValues as mongoose.Model<ControlValuesModel>) ||
  mongoose.model<ControlValuesModel>('controls', controlValuesSchema);
