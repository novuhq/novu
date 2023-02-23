import { Types } from 'mongoose';
import {
  EnvironmentId,
  ExternalSubscriberId,
  OrganizationId,
  SubscriberId,
  TopicId,
  TopicKey,
  TopicSubscriberId,
} from './types';

export class TopicSubscribersEntity {
  _id: TopicSubscriberId;
  _environmentId: EnvironmentId;
  _organizationId: OrganizationId;
  _subscriberId: SubscriberId;
  _topicId: TopicId;
  topicKey: TopicKey;
  externalSubscriberId: ExternalSubscriberId;
}

export type TopicSubscribersDBModel = Omit<
  TopicSubscribersEntity,
  '_environmentId' | '_organizationId' | '_subscriberId' | '_topicId'
> & {
  _environmentId: Types.ObjectId;

  _organizationId: Types.ObjectId;

  _subscriberId: Types.ObjectId;

  _topicId: Types.ObjectId;
};

export type CreateTopicSubscribersEntity = Omit<TopicSubscribersEntity, '_id'>;
