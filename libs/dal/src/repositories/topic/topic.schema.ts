import mongoose, { Schema } from 'mongoose';

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

topicSchema.index({
  _environmentId: 1,
  _organizationId: 1,
  key: 1,
});

export const Topic =
  (mongoose.models.Topic as mongoose.Model<TopicDBModel>) || mongoose.model<TopicDBModel>('Topic', topicSchema);
