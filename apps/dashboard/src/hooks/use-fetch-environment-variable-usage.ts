import { useQuery } from '@tanstack/react-query';
import { GetEnvironmentVariableUsageResponse, getEnvironmentVariableUsage } from '@/api/environment-variables';
import { QueryKeys } from '@/utils/query-keys';

export const useFetchEnvironmentVariableUsage = ({
  variableId,
  enabled = true,
}: {
  variableId: string;
  enabled?: boolean;
}) => {
  const {
    data: usage,
    isPending,
    error,
  } = useQuery<GetEnvironmentVariableUsageResponse>({
    queryKey: [QueryKeys.fetchEnvironmentVariableUsage, variableId],
    queryFn: () => getEnvironmentVariableUsage(variableId),
    enabled: !!variableId && enabled,
  });

  return {
    usage,
    isPending,
    error,
  };
};
