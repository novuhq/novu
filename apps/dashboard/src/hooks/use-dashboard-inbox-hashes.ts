import { useQuery } from '@tanstack/react-query';
import { getDashboardInboxHashes } from '@/api/environments';
import { useAuth } from '@/context/auth/hooks';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

/**
 * HMAC hashes for the Inbox and web chat sessions the dashboard opens in the current environment.
 * `isSettled` is true after success or failure: without hashes a session still works while HMAC is off.
 */
export function useDashboardInboxHashes({ agentIdentifier }: { agentIdentifier?: string } = {}) {
  const { currentEnvironment } = useEnvironment();
  const { currentUser } = useAuth();

  const { data, isPending } = useQuery({
    queryKey: [QueryKeys.dashboardInboxHashes, currentEnvironment?._id, currentUser?._id, agentIdentifier],
    queryFn: ({ signal }) =>
      getDashboardInboxHashes({
        environment: requireEnvironment(currentEnvironment, 'No environment selected'),
        agentIdentifier,
        signal,
      }),
    enabled: !!currentEnvironment?._id && !!currentUser?._id,
    staleTime: Infinity,
    retry: false,
    meta: { showError: false },
  });

  return {
    subscriberHash: data?.subscriberHash,
    webChatSubscriberHash: data?.webChatSubscriberHash,
    agentHash: data?.agentHash,
    isSettled: !isPending,
  };
}
