import mongoose from 'mongoose';
import { Schema } from 'mongoose';
const mongooseDelete = require('mongoose-delete');

import { schemaOptions } from '../schema-default.options';
import { FeedDBModel } from './feed.entity';

const feedSchema = new Schema<FeedDBModel>(
  {
    name: Schema.Types.String,
    identifier: {
      type: Schema.Types.String,
      index: true,
    },
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
  },
  schemaOptions
);

feedSchema.plugin(mongooseDelete, { deletedAt: true, deletedBy: true, overrideMethods: 'all' });

export const Feed =
  (mongoose.models.Feed as mongoose.Model<FeedDBModel>) || mongoose.model<FeedDBModel>('Feed', feedSchema);
