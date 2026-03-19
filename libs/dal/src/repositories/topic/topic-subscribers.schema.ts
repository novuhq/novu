import mongoose, { Schema } from 'mongoose';
import { schemaOptions } from '../schema-default.options';
import { TopicSubscribersDBModel } from './topic-subscribers.entity';

const topicSubscribersSchema = new Schema<TopicSubscribersDBModel>(
  {
    _environmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
      required: true,
    },
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
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
      required: true,
    },
    externalSubscriberId: Schema.Types.String,
    name: {
      type: Schema.Types.String,
      required: false,
    },
    identifier: {
      type: Schema.Types.String,
    },
    contextKeys: {
      type: [Schema.Types.String],
      default: undefined,
    },
  },
  schemaOptions
);

topicSubscribersSchema.index({
  _topicId: 1,
});

topicSubscribersSchema.index({
  topicKey: 1,
});

topicSubscribersSchema.index(
  {
    _environmentId: 1,
    identifier: 1,
  },
  { unique: true }
);

topicSubscribersSchema.index({
  _subscriberId: 1,
  _environmentId: 1,
  topicKey: 1,
});

export const TopicSubscribers =
  (mongoose.models.TopicSubscribers as mongoose.Model<TopicSubscribersDBModel>) ||
  mongoose.model<TopicSubscribersDBModel>('TopicSubscribers', topicSubscribersSchema);
