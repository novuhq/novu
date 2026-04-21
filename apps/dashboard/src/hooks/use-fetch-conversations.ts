import { useQuery } from '@tanstack/react-query';
import { ConversationFilters, ConversationsListResponse, getConversationsList } from '@/api/conversations';
import { conversationQueryKeys } from '@/components/conversations/conversation-query-keys';
import { useEnvironment } from '../context/environment/hooks';

type UseFetchConversationsOptions = {
  filters?: ConversationFilters;
  after?: string;
  before?: string;
  limit?: number;
};

export function useFetchConversations(
  { filters, after, before, limit = 10 }: UseFetchConversationsOptions = {},
  {
    enabled = true,
    refetchOnWindowFocus = false,
  }: {
    enabled?: boolean;
    refetchOnWindowFocus?: boolean;
  } = {}
) {
  const { currentEnvironment } = useEnvironment();

  const { data, ...rest } = useQuery<ConversationsListResponse>({
    queryKey: [conversationQueryKeys.fetchConversations, currentEnvironment?._id, after, before, limit, filters],
    queryFn: async ({ signal }) => {
      // biome-ignore lint/style/noNonNullAssertion: guarded by `enabled` below
      return getConversationsList({ environment: currentEnvironment!, after, before, limit, filters, signal });
    },
    refetchOnWindowFocus,
    enabled: enabled && !!currentEnvironment,
  });

  return {
    conversations: data?.data || [],
    next: data?.next ?? null,
    previous: data?.previous ?? null,
    totalCount: data?.totalCount ?? 0,
    totalCountCapped: data?.totalCountCapped ?? false,
    ...rest,
  };
}
