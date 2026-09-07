import mongoose, { Schema } from 'mongoose';

import { schemaOptions } from '../schema-default.options';
import { FeedDBModel } from './feed.entity';

const mongooseDelete = require('mongoose-delete');

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

feedSchema.index({
  _organizationId: 1,
});

feedSchema.index({
  _environmentId: 1,
});

feedSchema.index({
  identifier: 1,
});

feedSchema.plugin(mongooseDelete, { deletedAt: true, deletedBy: true, overrideMethods: 'all' });

export const Feed =
  (mongoose.models.Feed as mongoose.Model<FeedDBModel>) || mongoose.model<FeedDBModel>('Feed', feedSchema);
