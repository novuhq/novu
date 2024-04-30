import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';

import { schemaOptions } from '../schema-default.options';
import { ChangeDBModel } from './change.entity';

const changeSchema = new Schema<ChangeDBModel>(
  {
    enabled: {
      type: Schema.Types.Boolean,
      default: false,
    },
    type: {
      type: Schema.Types.String,
    },
    change: Schema.Types.Mixed,
    _environmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
      index: true,
    },
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    _entityId: { type: Schema.Types.ObjectId, index: true },
    _creatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    _parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Change',
    },
  },
  { ...schemaOptions }
);

changeSchema.virtual('user', {
  ref: 'User',
  localField: '_creatorId',
  foreignField: '_id',
  justOne: true,
});

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Change =
  (mongoose.models.Change as mongoose.Model<ChangeDBModel>) || mongoose.model<ChangeDBModel>('Change', changeSchema);
