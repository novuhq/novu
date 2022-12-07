import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';

import { TopicSubscribersEntity } from './topic-subscribers.entity';

import { schemaOptions } from '../schema-default.options';

const topicSubscribersSchema = new Schema(
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
    _topicId: {
      type: Schema.Types.ObjectId,
      ref: 'Topic',
      index: true,
      required: true,
    },
    subscribers: [{ type: Schema.Types.ObjectId, ref: 'Subscriber', required: true }],
  },
  schemaOptions
);

// eslint-disable-next-line @typescript-eslint/naming-convention
export const TopicSubscribers =
  mongoose.models.Topic || mongoose.model<TopicSubscribersEntity>('TopicSubscribers', topicSubscribersSchema);
