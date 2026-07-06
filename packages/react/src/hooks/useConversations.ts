import type { Conversation, NovuError } from '@novu/js';
import { useCallback, useEffect, useState } from 'react';
import { useDataRef } from './internal/useDataRef';
import { useNovu } from './NovuProvider';

/**
 * Lists a subscriber's web chat conversations with an agent — the thread
 * sidebar of a custom chat UI. Pairs with `useConversation` for the messages
 * of a single thread.
 *
 * @example
 * ```tsx
 * const { conversations, isLoading, fetchMore, hasMore } = useConversations({ agent: 'support-agent' });
 * ```
 */
export type UseConversationsProps = {
  /** Agent identifier (as shown in the Novu dashboard). */
  agent: string;
  /** Only needed when the agent has multiple web integrations. */
  integrationIdentifier?: string;
  limit?: number;
  onSuccess?: (data: Conversation[]) => void;
  onError?: (error: NovuError) => void;
};

export type UseConversationsResult = {
  conversations?: Conversation[];
  error?: NovuError;
  isLoading: boolean;
  isFetching: boolean;
  hasMore: boolean;
  refetch: () => Promise<void>;
  fetchMore: () => Promise<void>;
};

export const useConversations = (props: UseConversationsProps): UseConversationsResult => {
  const { agent, integrationIdentifier, limit = 30, onSuccess, onError } = props;
  const novu = useNovu();
  const [data, setData] = useState<Conversation[]>();
  const [error, setError] = useState<NovuError>();
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const length = data?.length;
  const before = length ? data[length - 1].lastActivityAt : undefined;
  const beforeRef = useDataRef<string | undefined>(before);
  const callbacksRef = useDataRef({ onSuccess, onError });

  const fetchConversations = useCallback(
    async (options?: { refetch: boolean }) => {
      if (options?.refetch) {
        setError(undefined);
        setIsLoading(true);
      }
      setIsFetching(true);

      const response = await novu.conversations.list({
        agent,
        integrationIdentifier,
        limit,
        before: options?.refetch ? undefined : beforeRef.current,
      });

      if (response.error) {
        setError(response.error);
        callbacksRef.current.onError?.(response.error);
      } else if (response.data) {
        const page = response.data;
        setData((previous) => (options?.refetch ? page.conversations : [...(previous ?? []), ...page.conversations]));
        setHasMore(page.hasMore);
        callbacksRef.current.onSuccess?.(page.conversations);
      }

      setIsLoading(false);
      setIsFetching(false);
    },
    [novu, agent, integrationIdentifier, limit, beforeRef, callbacksRef]
  );

  useEffect(() => {
    fetchConversations({ refetch: true });
  }, [fetchConversations]);

  const refetch = useCallback(() => fetchConversations({ refetch: true }), [fetchConversations]);

  const fetchMore = useCallback(async () => {
    if (!hasMore || isFetching) return;

    return fetchConversations();
  }, [hasMore, isFetching, fetchConversations]);

  return {
    conversations: data,
    error,
    isLoading,
    isFetching,
    hasMore,
    refetch,
    fetchMore,
  };
};
