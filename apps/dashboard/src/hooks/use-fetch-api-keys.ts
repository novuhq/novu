import { IApiKey } from '@novu/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { createApiKey, deleteApiKey, getApiKeys, regenerateApiKeys } from '../api/environments';

export const useFetchApiKeys = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const { currentEnvironment } = useEnvironment();

  const query = useQuery<{ data: IApiKey[] }>({
    queryKey: [QueryKeys.getApiKeys, currentEnvironment?._id],
    queryFn: async () =>
      await getApiKeys({ environment: requireEnvironment(currentEnvironment, 'No environment selected') }),
    enabled: !!currentEnvironment?._id && enabled,
  });

  return query;
};

export const useRegenerateApiKeys = () => {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      regenerateApiKeys({ environment: requireEnvironment(currentEnvironment, 'No environment selected') }),
    onSuccess: () => {
      // Invalidate the API keys query to refetch the new keys
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.getApiKeys, currentEnvironment?._id],
      });
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.dashboardInboxHashes, currentEnvironment?._id],
      });
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.agentWebChatHash, currentEnvironment?._id],
      });
    },
  });
};

export const useCreateApiKey = () => {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => createApiKey({ environment: requireEnvironment(currentEnvironment, 'No environment selected') }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.getApiKeys, currentEnvironment?._id],
      });
    },
  });
};

export const useDeleteApiKey = () => {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ hash }: { hash: string }) =>
      deleteApiKey({ environment: requireEnvironment(currentEnvironment, 'No environment selected'), hash }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.getApiKeys, currentEnvironment?._id],
      });
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.dashboardInboxHashes, currentEnvironment?._id],
      });
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.agentWebChatHash, currentEnvironment?._id],
      });
    },
  });
};
