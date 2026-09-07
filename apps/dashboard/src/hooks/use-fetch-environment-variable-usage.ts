import { useQuery } from '@tanstack/react-query';
import { GetEnvironmentVariableUsageResponse, getEnvironmentVariableUsage } from '@/api/environment-variables';
import { QueryKeys } from '@/utils/query-keys';

export const useFetchEnvironmentVariableUsage = ({
  variableKey,
  enabled = true,
}: {
  variableKey: string;
  enabled?: boolean;
}) => {
  const {
    data: usage,
    isPending,
    error,
  } = useQuery<GetEnvironmentVariableUsageResponse>({
    queryKey: [QueryKeys.fetchEnvironmentVariableUsage, variableKey],
    queryFn: () => getEnvironmentVariableUsage(variableKey),
    enabled: !!variableKey && enabled,
  });

  return {
    usage,
    isPending,
    error,
  };
};
