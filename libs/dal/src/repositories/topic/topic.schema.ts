import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';

import { TopicEntity } from './topic.entity';

import { schemaOptions } from '../schema-default.options';

const topicSchema = new Schema(
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
    _userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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
    customData: {
      type: Schema.Types.Mixed,
    },
  },
  schemaOptions
);

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Topic = mongoose.models.Topic || mongoose.model<TopicEntity>('Topic', topicSchema);
