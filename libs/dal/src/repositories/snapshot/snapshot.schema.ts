import { AiResourceTypeEnum, SnapshotSourceTypeEnum } from '@novu/shared';
import mongoose, { Schema } from 'mongoose';
import { schemaOptions } from '../schema-default.options';
import { SnapshotDBModel } from './snapshot.entity';

const snapshotSchema = new Schema<SnapshotDBModel>(
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
    resourceType: {
      type: Schema.Types.String,
      required: true,
      enum: Object.values(AiResourceTypeEnum),
    },
    resourceId: {
      type: Schema.Types.String,
      required: false,
    },
    sourceType: {
      type: Schema.Types.String,
      required: true,
      enum: Object.values(SnapshotSourceTypeEnum),
    },
    sourceId: {
      type: Schema.Types.String,
      required: true,
    },
    data: {
      type: Schema.Types.Mixed,
      required: false,
      default: null,
    },
  },
  { ...schemaOptions, minimize: false }
);

snapshotSchema.index({
  _environmentId: 1,
  sourceId: 1,
});

snapshotSchema.index({
  _environmentId: 1,
  resourceType: 1,
  resourceId: 1,
});

export const Snapshot =
  (mongoose.models.Snapshot as mongoose.Model<SnapshotDBModel>) ||
  mongoose.model<SnapshotDBModel>('Snapshot', snapshotSchema);
