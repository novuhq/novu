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
    id: {
      type: Schema.Types.String,
      required: true,
    },
    type: {
      type: Schema.Types.String,
      required: true,
    },
    key: {
      type: Schema.Types.String,
      required: true,
    },
    data: {
      type: Schema.Types.Mixed,
      required: false,
      default: {},
    },
  },
  { ...schemaOptions, minimize: false }
);

contextSchema.index(
  {
    _environmentId: 1,
    _organizationId: 1,
    type: 1,
    id: 1,
  },
  {
    unique: true,
  }
);

contextSchema.index(
  {
    _environmentId: 1,
    _organizationId: 1,
    key: 1,
  },
  {
    unique: true,
  }
);

contextSchema.index({
  _environmentId: 1,
  _organizationId: 1,
  createdAt: -1,
});

export const Context =
  (mongoose.models.Context as mongoose.Model<ContextDBModel>) ||
  mongoose.model<ContextDBModel>('Context', contextSchema);
