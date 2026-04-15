import { useQuery } from '@tanstack/react-query';
import { ConversationFilters, ConversationsListResponse, getConversationsList } from '@/api/conversations';
import { conversationQueryKeys } from '@/components/conversations/conversation-query-keys';
import { useEnvironment } from '../context/environment/hooks';

type UseFetchConversationsOptions = {
  filters?: ConversationFilters;
  page?: number;
  limit?: number;
};

export function useFetchConversations(
  { filters, page = 0, limit = 10 }: UseFetchConversationsOptions = {},
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
    queryKey: [conversationQueryKeys.fetchConversations, currentEnvironment?._id, page, limit, filters],
    queryFn: async ({ signal }) => {
      // biome-ignore lint/style/noNonNullAssertion: guarded by `enabled` below
      return getConversationsList({ environment: currentEnvironment!, page, limit, filters, signal });
    },
    refetchOnWindowFocus,
    enabled: enabled && !!currentEnvironment,
  });

  return {
    conversations: data?.data || [],
    hasMore: data?.hasMore || false,
    totalCount: data?.totalCount || 0,
    ...rest,
    page,
  };
}
