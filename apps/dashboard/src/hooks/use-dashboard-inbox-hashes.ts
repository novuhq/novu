import { IEnvironment } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { getDashboardInboxHashes } from '@/api/environments';
import { useAuth } from '@/context/auth/hooks';
import { requireEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

/**
 * `isSettled` is true after success or failure: without hashes a session still works while HMAC is off.
 */
export function useDashboardInboxHashes(environment: IEnvironment | undefined, { enabled = true } = {}) {
  const { currentUser } = useAuth();

  const { data, isPending } = useQuery({
    queryKey: [QueryKeys.dashboardInboxHashes, environment?._id, currentUser?._id],
    queryFn: ({ signal }) =>
      getDashboardInboxHashes({
        environment: requireEnvironment(environment, 'No environment selected'),
        signal,
      }),
    enabled: enabled && !!environment?._id && !!currentUser?._id,
    staleTime: Infinity,
    retry: false,
    meta: { showError: false },
  });

  return {
    subscriberHash: data?.subscriberHash,
    webChatSubscriberHash: data?.webChatSubscriberHash,
    isSettled: !isPending,
  };
}
