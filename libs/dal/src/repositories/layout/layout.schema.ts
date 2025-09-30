import mongoose, { Schema } from 'mongoose';
import { schemaOptions } from '../schema-default.options';
import { LayoutDBModel } from './layout.entity';

const mongooseDelete = require('mongoose-delete');

const layoutSchema = new Schema<LayoutDBModel>(
  {
    _environmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
      index: true,
    },
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    _creatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    _parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Layout',
    },
    _updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    name: Schema.Types.String,
    identifier: Schema.Types.String,
    description: Schema.Types.String,
    variables: [
      {
        name: Schema.Types.String,
        type: {
          type: Schema.Types.String,
        },
        required: {
          type: Schema.Types.Boolean,
          default: false,
        },
        defaultValue: Schema.Types.Mixed,
      },
    ],
    content: Schema.Types.String,
    contentType: Schema.Types.String,
    isDefault: {
      type: Schema.Types.Boolean,
      default: false,
    },
    channel: {
      type: Schema.Types.String,
    },
    type: {
      type: Schema.Types.String,
    },
    origin: {
      type: Schema.Types.String,
    },
    controls: { schema: Schema.Types.Mixed, uiSchema: Schema.Types.Mixed },
  },
  schemaOptions
);

layoutSchema.plugin(mongooseDelete, { deletedAt: true, deletedBy: true, overrideMethods: 'all' });

layoutSchema.virtual('updatedBy', {
  ref: 'User',
  localField: '_updatedBy',
  foreignField: '_id',
  justOne: true,
  select: '_id firstName lastName externalId',
});

layoutSchema.index({
  _environmentId: 1,
});

export const Layout =
  (mongoose.models.Layout as mongoose.Model<LayoutDBModel>) || mongoose.model<LayoutDBModel>('Layout', layoutSchema);
