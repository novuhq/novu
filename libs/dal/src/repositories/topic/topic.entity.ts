import { Types } from 'mongoose';

import { EnvironmentId, OrganizationId, TopicId, TopicKey, TopicName } from './types';

export class TopicEntity {
  _id: TopicId;
  _environmentId: EnvironmentId;
  _organizationId: OrganizationId;
  key: TopicKey;
  name?: TopicName;

  createdAt?: string;
  updatedAt?: string;
}

export type TopicDBModel = Omit<TopicEntity, '_environmentId' | '_organizationId'> & {
  _environmentId: Types.ObjectId;

  _organizationId: Types.ObjectId;
};

export interface TopicPreferencesSummary {
  condition?: Record<string, unknown>;
  result: boolean;
  subscriptionIdentifier: string;
}

export type TopicWithPreferences = {
  _topicId: string;
  topicKey: string;
  preferenceEvaluation?: TopicPreferencesSummary;
};
