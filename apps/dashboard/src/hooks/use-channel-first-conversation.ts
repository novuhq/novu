import { useQuery } from '@tanstack/react-query';
import { type ConversationsListResponse, getConversationsList } from '@/api/conversations';
import { useEnvironment } from '@/context/environment/hooks';

const POLL_INTERVAL_MS = 3000;

type UseChannelFirstConversationParams = {
  /** Agent public identifier (the `agentId` conversations filter resolves by identifier). */
  agentIdentifier: string;
  /** Mongo `_id` of the integration whose first end-user conversation we wait for. */
  integrationId: string;
  /** Chat provider id, used to scope the conversations query. */
  provider: string;
  enabled?: boolean;
};

function hasMatchingConversation(data: ConversationsListResponse | undefined, integrationId: string): boolean {
  if (!data) {
    return false;
  }

  return data.data.some((conversation) =>
    (conversation.channels ?? []).some((channel) => channel._integrationId === integrationId)
  );
}

/**
 * Polls the conversations API for the first end-user conversation created through the embedded
 * SDK connect button for a specific integration. Returns `connected: true` once one appears.
 * Callers should disable this where conversations are unavailable (e.g. self-hosted community).
 */
export function useChannelFirstConversation({
  agentIdentifier,
  integrationId,
  provider,
  enabled = true,
}: UseChannelFirstConversationParams) {
  const { currentEnvironment } = useEnvironment();

  const query = useQuery<ConversationsListResponse>({
    queryKey: ['agent-channel-first-conversation', currentEnvironment?._id, agentIdentifier, integrationId, provider],
    queryFn: ({ signal }) =>
      getConversationsList({
        // biome-ignore lint/style/noNonNullAssertion: guarded by `enabled` below
        environment: currentEnvironment!,
        limit: 20,
        filters: { agentId: agentIdentifier, provider: [provider] },
        signal,
      }),
    enabled: enabled && Boolean(currentEnvironment),
    refetchOnWindowFocus: false,
    refetchInterval: (query) => (hasMatchingConversation(query.state.data, integrationId) ? false : POLL_INTERVAL_MS),
  });

  return {
    connected: hasMatchingConversation(query.data, integrationId),
    isLoading: query.isLoading,
  };
}
