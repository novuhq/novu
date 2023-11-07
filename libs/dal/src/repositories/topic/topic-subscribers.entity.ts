import {
  EnvironmentId,
  ExternalSubscriberId,
  OrganizationId,
  SubscriberId,
  TopicId,
  TopicKey,
  TopicSubscriberId,
} from './types';
import type { IEntity, TransformEntityToDbModel } from '../../types';

export class TopicSubscribersEntity implements IEntity {
  _id: TopicSubscriberId;
  _environmentId: EnvironmentId;
  _organizationId: OrganizationId;
  _subscriberId: SubscriberId;
  _topicId: TopicId;
  topicKey: TopicKey;
  externalSubscriberId: ExternalSubscriberId;
}

export type TopicSubscribersDBModel = TransformEntityToDbModel<TopicSubscribersEntity>;

export type CreateTopicSubscribersEntity = Omit<TopicSubscribersEntity, '_id'>;
