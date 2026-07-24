import { useQuery } from '@tanstack/react-query';
import { type ConversationUsage, getConversationUsage } from '@/api/agents';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

export const useFetchConversationUsage = () => {
  const { currentOrganization } = useAuth();
  const { currentEnvironment } = useEnvironment();

  const { data: conversationUsage, isLoading } = useQuery<ConversationUsage>({
    // Org-scoped data (counts org-wide) — environment is not part of the identity.
    queryKey: [QueryKeys.fetchConversationUsage, currentOrganization?._id],
    queryFn: ({ signal }) => getConversationUsage(currentEnvironment!, signal),
    enabled: !!currentOrganization && !!currentEnvironment,
    meta: {
      showError: false,
    },
  });

  return {
    conversationUsage,
    isLoading,
  };
};
