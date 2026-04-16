import { getDateRangeInMs, type IEnvironment } from '@novu/shared';
import { get } from './api.client';

export type ConversationFilters = {
  dateRange?: string;
  subscriberId?: string;
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
  page: number;
  totalCount: number;
  pageSize: number;
  hasMore: boolean;
};

export function getConversationsList({
  environment,
  page,
  limit,
  filters,
  signal,
}: {
  environment: IEnvironment;
  page: number;
  limit: number;
  filters?: ConversationFilters;
  signal?: AbortSignal;
}): Promise<ConversationsListResponse> {
  const searchParams = new URLSearchParams();
  searchParams.append('page', page.toString());
  searchParams.append('limit', limit.toString());

  if (filters?.status) {
    searchParams.append('status', filters.status);
  }

  if (filters?.subscriberId) {
    searchParams.append('subscriberId', filters.subscriberId);
  }

  if (filters?.dateRange) {
    const after = new Date(Date.now() - getDateRangeInMs(filters.dateRange));
    searchParams.append('after', after.toISOString());
  }

  if (filters?.provider?.length) {
    for (const p of filters.provider) {
      searchParams.append('provider', p);
    }
  }

  if (filters?.conversationId) {
    searchParams.append('conversationId', filters.conversationId);
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
  signalData?: { type: string; payload?: Record<string, unknown> };
  _environmentId: string;
  _organizationId: string;
  createdAt: string;
};

export type ConversationActivitiesResponse = {
  data: ConversationActivityDto[];
  page: number;
  totalCount: number;
  pageSize: number;
  hasMore: boolean;
};

/** `conversationIdentifier` is the public `identifier` field — the API resolves by identifier, not Mongo `_id`. */
export function getConversation(
  conversationIdentifier: string,
  environment: IEnvironment
): Promise<ConversationDto> {
  return get<ConversationDto>(`/conversations/${encodeURIComponent(conversationIdentifier)}`, {
    environment,
  });
}

export function getConversationActivities({
  conversationIdentifier,
  environment,
  page = 0,
  limit = 50,
  signal,
}: {
  conversationIdentifier: string;
  environment: IEnvironment;
  page?: number;
  limit?: number;
  signal?: AbortSignal;
}): Promise<ConversationActivitiesResponse> {
  const searchParams = new URLSearchParams();
  searchParams.append('page', page.toString());
  searchParams.append('limit', limit.toString());

  return get<ConversationActivitiesResponse>(
    `/conversations/${encodeURIComponent(conversationIdentifier)}/activities?${searchParams.toString()}`,
    { environment, signal }
  );
}
