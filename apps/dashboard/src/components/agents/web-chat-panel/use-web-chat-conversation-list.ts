import { useNovu } from '@novu/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

export type WebChatSessionItem = {
  identifier: string;
  title: string;
  lastActivityAt: string;
};

const VISIBLE_LIMIT = 5;
const PAGE_SIZE = 20;
const MAX_PAGES = 5;

export const webChatConversationListQueryKey = (
  agentIdentifier: string,
  environmentIdentifier: string,
  subscriberId: string
) => ['web-chat-conversation-list', agentIdentifier, environmentIdentifier, subscriberId] as const;

async function fetchAgentConversations(
  novu: ReturnType<typeof useNovu>,
  agentIdentifier: string,
  signal?: AbortSignal
): Promise<WebChatSessionItem[]> {
  await novu.loadWebChat();

  const matches: WebChatSessionItem[] = [];
  let after: string | undefined;

  for (let page = 0; page < MAX_PAGES && matches.length < VISIBLE_LIMIT; page++) {
    if (signal?.aborted) {
      throw signal.reason ?? new DOMException('Aborted', 'AbortError');
    }

    const { data, error } = await novu.webChat.listConversations({
      limit: PAGE_SIZE,
      orderBy: 'lastActivityAt',
      orderDirection: 'DESC',
      ...(after ? { after } : {}),
    });

    if (error) {
      throw error;
    }

    for (const conversation of data?.conversations ?? []) {
      if (conversation.agentIdentifier !== agentIdentifier) {
        continue;
      }

      matches.push({
        identifier: conversation.identifier,
        title: conversation.title.trim() || 'Untitled conversation',
        lastActivityAt: conversation.lastActivityAt,
      });

      if (matches.length >= VISIBLE_LIMIT) {
        return matches;
      }
    }

    if (!data?.next) {
      break;
    }

    after = data.next;
  }

  return matches;
}

export function useWebChatConversationList(
  agentIdentifier: string,
  environmentIdentifier: string,
  subscriberId: string
) {
  const novu = useNovu();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: webChatConversationListQueryKey(agentIdentifier, environmentIdentifier, subscriberId),
    queryFn: ({ signal }) => fetchAgentConversations(novu, agentIdentifier, signal),
    enabled: Boolean(agentIdentifier && environmentIdentifier && subscriberId),
    refetchOnWindowFocus: false,
  });

  const reload = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: webChatConversationListQueryKey(agentIdentifier, environmentIdentifier, subscriberId),
    });
  }, [agentIdentifier, environmentIdentifier, queryClient, subscriberId]);

  return {
    items: query.data ?? [],
    failed: query.isError,
    reload,
  };
}
