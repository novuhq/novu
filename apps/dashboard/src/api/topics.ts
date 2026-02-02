import { RulesLogic } from '@novu/js';
import type { CustomDataType, DirectionEnum, IEnvironment, SeverityLevelEnum } from '@novu/shared';
import { Topic } from '@/components/topics/types';
import { convertContextKeysToPayload } from '@/utils/context-variable-utils';
import { delV2, getV2, patchV2, postV2 } from './api.client';

export type ListTopicsResponse = {
  data: Array<Topic>;
  next: string | null;
  previous: string | null;
  totalCount: number;
  totalCountCapped: boolean;
};

export type DeleteTopicSubscriptionsResponseDto = {
  acknowledged: boolean;
};

export const getTopics = async ({
  environment,
  after,
  before,
  limit,
  key,
  name,
  orderDirection,
  orderBy,
  includeCursor,
  signal,
}: {
  environment: IEnvironment;
  after?: string;
  before?: string;
  limit?: number;
  key?: string;
  name?: string;
  orderDirection?: DirectionEnum;
  orderBy?: string;
  includeCursor?: boolean;
  signal?: AbortSignal;
}): Promise<ListTopicsResponse> => {
  const params = new URLSearchParams({
    ...(limit && { limit: limit.toString() }),
    ...(after && { after }),
    ...(before && { before }),
    ...(orderDirection && { orderDirection }),
    ...(key && { key }),
    ...(name && { name }),
    ...(orderBy && { orderBy }),
    ...(orderDirection && { orderDirection }),
    ...(includeCursor && { includeCursor: includeCursor.toString() }),
  });

  const response = await getV2<ListTopicsResponse>(`/topics?${params}`, {
    environment,
    signal,
  });

  return response;
};

export const deleteTopic = async ({ environment, topicKey }: { environment: IEnvironment; topicKey: string }) => {
  const response = await delV2<{ acknowledged: boolean }>(`/topics/${encodeURIComponent(topicKey)}`, {
    environment,
  });
  return response;
};

export const getTopic = async ({ environment, topicKey }: { environment: IEnvironment; topicKey: string }) => {
  const { data } = await getV2<{ data: Topic }>(`/topics/${encodeURIComponent(topicKey)}`, {
    environment,
  });

  return data;
};

export const createTopic = async ({ environment, topic }: { environment: IEnvironment; topic: Partial<Topic> }) => {
  const queryParams = new URLSearchParams();
  queryParams.append('failIfExists', 'true');

  const { data } = await postV2<{ data: Topic }>(`/topics?${queryParams}`, {
    environment,
    body: topic,
  });

  return data;
};

export const updateTopic = async ({
  environment,
  topicKey,
  topic,
}: {
  environment: IEnvironment;
  topicKey: string;
  topic: Partial<Topic>;
}) => {
  const { data } = await patchV2<{ data: Topic }>(`/topics/${topicKey}`, {
    environment,
    body: topic,
  });

  return data;
};

export const addSubscribersToTopic = async ({
  environment,
  topicKey,
  subscribers,
  contextKeys,
}: {
  environment: IEnvironment;
  topicKey: string;
  subscribers: string[];
  contextKeys?: string[];
}) => {
  const context = convertContextKeysToPayload(contextKeys);

  const { data } = await postV2<{
    data: {
      succeeded: string[];
      failed?: {
        notFound: string[];
      };
    };
  }>(`/topics/${encodeURIComponent(topicKey)}/subscriptions`, {
    environment,
    body: {
      subscriberIds: subscribers,
      ...(context && { context }),
    },
  });

  return data;
};

export const removeSubscribersFromTopic = async ({
  environment,
  topicKey,
  subscribers,
}: {
  environment: IEnvironment;
  topicKey: string;
  subscribers: string[];
}) => {
  await delV2<DeleteTopicSubscriptionsResponseDto>(`/topics/${encodeURIComponent(topicKey)}/subscriptions`, {
    environment,
    body: { subscriberIds: subscribers },
  });

  return { acknowledged: true };
};

export const deleteTopicSubscription = async ({
  environment,
  topicKey,
  identifier,
  subscriberId,
}: {
  environment: IEnvironment;
  topicKey: string;
  identifier: string;
  subscriberId: string;
}) => {
  await delV2<DeleteTopicSubscriptionsResponseDto>(`/topics/${encodeURIComponent(topicKey)}/subscriptions`, {
    environment,
    body: { subscriptions: [{ identifier, subscriberId }] },
  });

  return { acknowledged: true };
};

export type TopicSubscription = {
  _id: string;
  identifier: string;
  createdAt: string;
  topic: {
    _id: string;
    key: string;
    name: string;
    createdAt: string;
    updatedAt: string;
  };
  subscriber: {
    _id: string;
    subscriberId: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    avatar?: string;
  };
};

export type ListTopicSubscriptionsResponse = {
  data: TopicSubscription[];
  next: string | null;
  previous: string | null;
  totalCount: number;
  totalCountCapped: boolean;
};

export type WorkflowDto = {
  id: string;
  identifier: string;
  name: string;
  critical: boolean;
  tags?: string[];
  data?: CustomDataType;
  severity: SeverityLevelEnum;
};

export type TopicSubscriptionPreference = {
  workflow: WorkflowDto;
  subscriptionId: string;
  enabled: boolean;
  condition?: RulesLogic;
};

export type TopicSubscriptionDetailsResponse = {
  id: string;
  identifier?: string;
  name?: string;
  preferences: TopicSubscriptionPreference[];
};

export const getTopicSubscriptions = async ({
  environment,
  topicKey,
  limit = 100,
  after,
  before,
  subscriberId,
  contextKeys,
}: {
  environment: IEnvironment;
  topicKey: string;
  limit?: number;
  after?: string;
  before?: string;
  subscriberId?: string;
  contextKeys?: string[];
}): Promise<ListTopicSubscriptionsResponse> => {
  const params = new URLSearchParams();

  if (limit) params.append('limit', limit.toString());
  if (after) params.append('after', after);
  if (before) params.append('before', before);
  if (subscriberId) params.append('subscriberId', subscriberId);

  if (contextKeys?.length) {
    for (const contextKey of contextKeys) {
      params.append('contextKeys', contextKey);
    }
  }

  const query = params.toString() ? `?${params.toString()}` : '';

  const response = await getV2<ListTopicSubscriptionsResponse>(
    `/topics/${encodeURIComponent(topicKey)}/subscriptions${query}`,
    {
      environment,
    }
  );

  return response;
};

export const getTopicSubscription = async ({
  environment,
  topicKey,
  subscriptionId,
}: {
  environment: IEnvironment;
  topicKey: string;
  subscriptionId: string;
}): Promise<TopicSubscriptionDetailsResponse> => {
  const response = await getV2<{ data: TopicSubscriptionDetailsResponse }>(
    `/topics/${encodeURIComponent(topicKey)}/subscriptions/${subscriptionId}`,
    {
      environment,
    }
  );

  return response.data;
};
