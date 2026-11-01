import { useQuery } from '@tanstack/react-query';
import { getAgentWebChatHash } from '@/api/agents';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

/**
 * Web chat `agentHash` the dashboard tester sends for the agent in the current environment.
 * `isSettled` is true after success or failure: without the hash web chat still works while HMAC is off.
 */
export function useAgentWebChatHash(agentIdentifier: string) {
  const { currentEnvironment } = useEnvironment();

  const { data, isPending } = useQuery({
    queryKey: [QueryKeys.agentWebChatHash, currentEnvironment?._id, agentIdentifier],
    queryFn: ({ signal }) =>
      getAgentWebChatHash(requireEnvironment(currentEnvironment, 'No environment selected'), agentIdentifier, signal),
    enabled: !!currentEnvironment?._id && !!agentIdentifier,
    staleTime: Infinity,
    retry: false,
    meta: { showError: false },
  });

  return { agentHash: data, isSettled: !isPending };
}
