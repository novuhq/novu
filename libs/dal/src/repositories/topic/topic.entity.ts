import { Types } from 'mongoose';

import { EnvironmentId, OrganizationId, TopicId, TopicKey, TopicName } from './types';
import { TransformEntityToDbModel } from '../../types';

export class TopicEntity {
  _id: TopicId;
  _environmentId: EnvironmentId;
  _organizationId: OrganizationId;
  key: TopicKey;
  name: TopicName;
}

export type TopicDBModel = TransformEntityToDbModel<TopicEntity>;
