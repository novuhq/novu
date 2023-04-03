import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';

import { TopicDBModel } from './topic.entity';
import { schemaOptions } from '../schema-default.options';

const topicSchema = new Schema<TopicDBModel>(
  {
    _environmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
      index: true,
      required: true,
    },
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
      required: true,
    },
    key: {
      type: Schema.Types.String,
      required: true,
    },
    name: {
      type: Schema.Types.String,
      required: true,
    },
  },
  schemaOptions
);

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Topic =
  (mongoose.models.Topic as mongoose.Model<TopicDBModel>) || mongoose.model<TopicDBModel>('Topic', topicSchema);
