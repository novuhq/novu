import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';
import { schemaOptions } from '../schema-default.options';
import { ChangeEntity } from './change.entity';

const changeSchema = new Schema(
  {
    enabled: {
      type: Schema.Types.Boolean,
      default: false,
    },
    type: Schema.Types.String,
    createdAt: {
      type: Schema.Types.Date,
      default: Date.now,
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
    _entityId: Schema.Types.ObjectId,
    _creatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { ...schemaOptions }
);

interface IChangeDocument extends ChangeEntity, Document {
  _id: never;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Change = mongoose.models.Change || mongoose.model<IChangeDocument>('Change', changeSchema);
