import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';

import { TopicSubscribersDBModel } from './topic-subscribers.entity';

import { schemaOptions } from '../schema-default.options';

const topicSubscribersSchema = new Schema<TopicSubscribersDBModel>(
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
    _subscriberId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscriber',
      index: true,
      required: true,
    },
    _topicId: {
      type: Schema.Types.ObjectId,
      ref: 'Topic',
      index: true,
      required: true,
    },
    topicKey: {
      type: Schema.Types.String,
      index: true,
      required: true,
    },
    externalSubscriberId: Schema.Types.String,
  },
  schemaOptions
);

// eslint-disable-next-line @typescript-eslint/naming-convention
export const TopicSubscribers =
  (mongoose.models.TopicSubscribers as mongoose.Model<TopicSubscribersDBModel>) ||
  mongoose.model<TopicSubscribersDBModel>('TopicSubscribers', topicSubscribersSchema);
