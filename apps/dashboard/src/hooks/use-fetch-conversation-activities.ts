import { useQuery } from '@tanstack/react-query';
import {
  ConversationActivitiesResponse,
  ConversationDto,
  getConversation,
  getConversationActivities,
} from '@/api/conversations';
import { QueryKeys } from '@/utils/query-keys';
import { useEnvironment } from '../context/environment/hooks';

export function useFetchConversation(conversationId: string | null) {
  const { currentEnvironment } = useEnvironment();

  const { data, ...rest } = useQuery<ConversationDto>({
    queryKey: [QueryKeys.fetchConversation, currentEnvironment?._id, conversationId],
    queryFn: async () => {
      if (!conversationId || !currentEnvironment) {
        throw new Error('Missing conversation identifier or environment');
      }

      return getConversation(conversationId, currentEnvironment);
    },
    enabled: !!conversationId && !!currentEnvironment,
    refetchOnWindowFocus: false,
  });

  return { conversation: data, ...rest };
}

export function useFetchConversationActivities(conversationId: string | null) {
  const { currentEnvironment } = useEnvironment();

  const { data, ...rest } = useQuery<ConversationActivitiesResponse>({
    queryKey: [QueryKeys.fetchConversation, 'activities', currentEnvironment?._id, conversationId],
    queryFn: async ({ signal }) => {
      if (!conversationId || !currentEnvironment) {
        throw new Error('Missing conversation identifier or environment');
      }

      return getConversationActivities({
        conversationIdentifier: conversationId,
        environment: currentEnvironment,
        signal,
      });
    },
    enabled: !!conversationId && !!currentEnvironment,
    refetchOnWindowFocus: false,
  });

  return {
    activities: data?.data ?? [],
    totalCount: data?.totalCount ?? 0,
    ...rest,
  };
}
