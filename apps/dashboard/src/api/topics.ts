import { Topic } from '@/components/topics/types';
import type { DirectionEnum, IEnvironment } from '@novu/shared';
import { del, get, patch, post } from './api.client';

export type ListTopicsResponse = {
  data: Array<Topic>;
  next: string | null;
  previous: string | null;
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

  const response = await get<ListTopicsResponse>(`/topics?${params}`, {
    environment,
    signal,
  });

  return response;
};

export const deleteTopic = async ({ environment, topicKey }: { environment: IEnvironment; topicKey: string }) => {
  const response = await del<{ acknowledged: boolean }>(`/topics/${topicKey}`, {
    environment,
  });
  return response;
};

export const getTopic = async ({ environment, topicKey }: { environment: IEnvironment; topicKey: string }) => {
  const { data } = await get<{ data: Topic }>(`/topics/${topicKey}`, {
    environment,
  });

  return data;
};

export const createTopic = async ({ environment, topic }: { environment: IEnvironment; topic: Partial<Topic> }) => {
  const { data } = await post<{ data: Topic }>(`/topics`, {
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
  const { data } = await patch<{ data: Topic }>(`/topics/${topicKey}`, {
    environment,
    body: topic,
  });

  return data;
};

export const addSubscribersToTopic = async ({
  environment,
  topicKey,
  subscribers,
}: {
  environment: IEnvironment;
  topicKey: string;
  subscribers: string[];
}) => {
  const { data } = await post<{
    data: {
      succeeded: string[];
      failed?: {
        notFound: string[];
      };
    };
  }>(`/topics/${topicKey}/subscribers`, {
    environment,
    body: { subscribers },
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
  await post(`/topics/${topicKey}/subscribers/removal`, {
    environment,
    body: { subscribers },
  });

  return { success: true };
};
