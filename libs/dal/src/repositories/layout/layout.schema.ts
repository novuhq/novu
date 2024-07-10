import * as mongoose from 'mongoose';
import * as mongooseDelete from 'mongoose-delete';
import { Schema } from 'mongoose';

import { LayoutDBModel } from './layout.entity';
import { schemaOptions } from '../schema-default.options';

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
  },
  schemaOptions
);

layoutSchema.plugin(mongooseDelete, { deletedAt: true, deletedBy: true, overrideMethods: 'all' });

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Layout =
  (mongoose.models.Layout as mongoose.Model<LayoutDBModel>) || mongoose.model<LayoutDBModel>('Layout', layoutSchema);
