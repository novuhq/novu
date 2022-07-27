import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';
import * as mongooseDelete from 'mongoose-delete';
import { schemaOptions } from '../schema-default.options';
import { FeedEntity } from './feed.entity';

// eslint-disable-next-line @typescript-eslint/naming-convention
const feedSchema = new Schema(
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

interface IFeedDocument extends FeedEntity, Document {
  _id: never;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Feed = mongoose.models.Feed || mongoose.model<IFeedDocument>('Feed', feedSchema);
