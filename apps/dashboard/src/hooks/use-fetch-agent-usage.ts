import { useQuery } from '@tanstack/react-query';
import { getAgentUsage, type GetAgentUsageResponse } from '@/api/agents';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

export const useFetchAgentUsage = ({
  agentIdentifier,
  enabled = true,
}: {
  agentIdentifier: string;
  enabled?: boolean;
}) => {
  const { currentEnvironment } = useEnvironment();

  const {
    data: usage,
    isPending,
    error,
  } = useQuery({
    queryKey: [QueryKeys.fetchAgentUsage, currentEnvironment?._id, agentIdentifier],
    queryFn: () => getAgentUsage(currentEnvironment!, agentIdentifier),
    enabled: Boolean(currentEnvironment?._id && agentIdentifier && enabled),
  });

  return {
    usage: usage as GetAgentUsageResponse | undefined,
    isPending,
    error,
  };
};
