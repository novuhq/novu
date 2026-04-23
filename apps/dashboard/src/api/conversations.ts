import { getDateRangeInMs, type IEnvironment } from '@novu/shared';
import { get } from './api.client';

export type ConversationFilters = {
  dateRange?: string;
  subscriberId?: string;
  agentId?: string;
  provider?: string[];
  conversationId?: string;
  status?: string;
};

export type ParticipantSubscriberData = {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  subscriberId: string;
};

export type ParticipantAgentData = {
  name: string;
  identifier: string;
};

export type ConversationParticipantDto = {
  type: string;
  id: string;
  subscriber?: ParticipantSubscriberData | null;
  agent?: ParticipantAgentData | null;
};

export type ConversationChannelDto = {
  platform: string;
  _integrationId: string;
  platformThreadId: string;
};

export type ConversationDto = {
  _id: string;
  identifier: string;
  _agentId: string;
  participants?: ConversationParticipantDto[];
  channels?: ConversationChannelDto[];
  status: string;
  title: string;
  metadata: Record<string, unknown>;
  _environmentId: string;
  _organizationId: string;
  createdAt: string;
  lastActivityAt: string;
};

export type ConversationsListResponse = {
  data: ConversationDto[];
  next: string | null;
  previous: string | null;
  totalCount: number;
  totalCountCapped: boolean;
};

export function getConversationsList({
  environment,
  after,
  before,
  limit,
  filters,
  signal,
}: {
  environment: IEnvironment;
  after?: string;
  before?: string;
  limit: number;
  filters?: ConversationFilters;
  signal?: AbortSignal;
}): Promise<ConversationsListResponse> {
  const searchParams = new URLSearchParams();
  searchParams.append('limit', limit.toString());

  if (after) {
    searchParams.append('after', after);
  } else if (before) {
    searchParams.append('before', before);
  }

  if (filters?.status) {
    searchParams.append('status', filters.status);
  }

  if (filters?.subscriberId) {
    searchParams.append('subscriberId', filters.subscriberId);
  }

  if (filters?.agentId) {
    searchParams.append('agentId', filters.agentId);
  }

  if (filters?.dateRange) {
    const ms = getDateRangeInMs(filters.dateRange);
    if (ms > 0) {
      searchParams.append('createdAfter', new Date(Date.now() - ms).toISOString());
    }
  }

  if (filters?.provider?.length) {
    for (const p of filters.provider) {
      searchParams.append('provider', p);
    }
  }

  const conversationIdentifier = filters?.conversationId?.trim();
  if (conversationIdentifier) {
    searchParams.append('identifier', conversationIdentifier);
  }

  return get<ConversationsListResponse>(`/conversations?${searchParams.toString()}`, {
    environment,
    signal,
  });
}

export type ConversationActivityDto = {
  _id: string;
  identifier: string;
  _conversationId: string;
  type: 'message' | 'update' | 'signal';
  content: string;
  platform: string;
  _integrationId: string;
  platformThreadId: string;
  senderType: 'subscriber' | 'platform_user' | 'agent' | 'system';
  senderId: string;
  senderName?: string;
  platformMessageId?: string;
  signalData?:
    | { type: 'metadata'; payload?: Record<string, unknown> }
    | { type: 'trigger'; payload?: { workflowId?: string; transactionId?: string; to?: unknown } }
    | { type: 'resolve'; payload?: Record<string, unknown> }
    | { type: string; payload?: Record<string, unknown> };
  _environmentId: string;
  _organizationId: string;
  createdAt: string;
};

export type ConversationActivitiesResponse = {
  data: ConversationActivityDto[];
  next: string | null;
  previous: string | null;
  totalCount: number;
  totalCountCapped: boolean;
};

/** `conversationIdentifier` is the public `identifier` field — the API resolves by identifier, not Mongo `_id`. */
export async function getConversation(
  conversationIdentifier: string,
  environment: IEnvironment
): Promise<ConversationDto> {
  const { data } = await get<{ data: ConversationDto }>(
    `/conversations/${encodeURIComponent(conversationIdentifier)}`,
    { environment }
  );

  return data;
}

export function getConversationActivities({
  conversationIdentifier,
  environment,
  after,
  before,
  limit = 50,
  signal,
}: {
  conversationIdentifier: string;
  environment: IEnvironment;
  after?: string;
  before?: string;
  limit?: number;
  signal?: AbortSignal;
}): Promise<ConversationActivitiesResponse> {
  const searchParams = new URLSearchParams();
  searchParams.append('limit', limit.toString());
  searchParams.append('orderBy', 'createdAt');
  searchParams.append('orderDirection', 'ASC');

  if (after) {
    searchParams.append('after', after);
  } else if (before) {
    searchParams.append('before', before);
  }

  return get<ConversationActivitiesResponse>(
    `/conversations/${encodeURIComponent(conversationIdentifier)}/activities?${searchParams.toString()}`,
    { environment, signal }
  );
}
