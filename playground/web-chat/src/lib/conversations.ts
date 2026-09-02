'use client';

import { useNovu, type WebChatConversation } from '@novu/react';
import { useCallback, useEffect, useState } from 'react';

/** Mirrors `WebChatConversation` from `@novu/js`. */
export type ConversationSummary = WebChatConversation;

const RECENT_LIMIT = 5;

/**
 * Recent conversations for the sidebar. The SDK holds the session token.
 */
export function useConversations() {
  const novu = useNovu();
  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      await novu.loadWebChat();
      const { data, error: listError } = await novu.webChat.listConversations({
        limit: RECENT_LIMIT,
        orderBy: 'lastActivityAt',
        orderDirection: 'DESC',
      });
      if (listError) {
        setError(listError.message);
        return;
      }

      setItems(data?.conversations ?? []);
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [novu]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, isLoading, error, reload };
}
