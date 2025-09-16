import { ContextTypeEnum } from '@novu/shared';
import mongoose, { Schema } from 'mongoose';
import { schemaOptions } from '../schema-default.options';
import { ContextDBModel } from './context.entity';

const contextSchema = new Schema<ContextDBModel>(
  {
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    _environmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
      index: true,
    },
    identifier: {
      type: Schema.Types.String,
      required: true,
      unique: true,
    },
    type: {
      type: Schema.Types.String,
      enum: ContextTypeEnum,
      required: true,
    },
    data: Schema.Types.Mixed,
  },
  schemaOptions
);

contextSchema.index(
  {
    _environmentId: 1,
    _organizationId: 1,
    type: 1,
    identifier: 1,
  },
  {
    unique: true,
  }
);

export const Context =
  (mongoose.models.Context as mongoose.Model<ContextDBModel>) ||
  mongoose.model<ContextDBModel>('Context', contextSchema);
