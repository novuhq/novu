import { IApiKey } from '@novu/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { getApiKeys, regenerateApiKeys } from '../api/environments';

export const useFetchApiKeys = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const { currentEnvironment } = useEnvironment();

  const query = useQuery<{ data: IApiKey[] }>({
    queryKey: [QueryKeys.getApiKeys, currentEnvironment?._id],
    queryFn: async () => await getApiKeys({ environment: currentEnvironment! }),
    enabled: !!currentEnvironment?._id && enabled,
  });

  return query;
};

export const useRegenerateApiKeys = () => {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => regenerateApiKeys({ environment: currentEnvironment! }),
    onSuccess: () => {
      // Invalidate the API keys query to refetch the new keys
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.getApiKeys, currentEnvironment?._id],
      });
    },
  });
};
