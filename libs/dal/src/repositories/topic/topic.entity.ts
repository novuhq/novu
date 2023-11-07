import { EnvironmentId, OrganizationId, TopicId, TopicKey, TopicName } from './types';
import type { IEntity, TransformEntityToDbModel } from '../../types';

export class TopicEntity implements IEntity {
  _id: TopicId;
  _environmentId: EnvironmentId;
  _organizationId: OrganizationId;
  key: TopicKey;
  name: TopicName;
}

export type TopicDBModel = TransformEntityToDbModel<TopicEntity>;
