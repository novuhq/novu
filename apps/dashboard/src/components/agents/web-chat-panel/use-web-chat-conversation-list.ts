import { useMemo } from 'react';
import { useFetchConversations } from '@/hooks/use-fetch-conversations';

export type WebChatSessionItem = {
  identifier: string;
  title: string;
  lastActivityAt: string;
};

export function useWebChatConversationList(agentIdentifier: string, subscriberId: string) {
  const { conversations, refetch } = useFetchConversations(
    {
      filters: {
        agentId: agentIdentifier,
        subscriberId,
      },
      limit: 20,
    },
    { enabled: Boolean(agentIdentifier && subscriberId) }
  );

  const items = useMemo<WebChatSessionItem[]>(
    () =>
      conversations.map((conversation) => ({
        identifier: conversation.identifier,
        title: conversation.title.trim() || 'Untitled conversation',
        lastActivityAt: conversation.lastActivityAt,
      })),
    [conversations]
  );

  return { items, reload: refetch };
}
