import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';
import * as mongooseDelete from 'mongoose-delete';

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

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Feed =
  (mongoose.models.Feed as mongoose.Model<FeedDBModel>) || mongoose.model<FeedDBModel>('Feed', feedSchema);
