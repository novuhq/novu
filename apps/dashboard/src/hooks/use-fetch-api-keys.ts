import { IApiKey } from '@novu/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { createApiKey, deleteApiKey, getApiKeys, regenerateApiKeys } from '../api/environments';

export const useFetchApiKeys = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const { currentEnvironment } = useEnvironment();

  const query = useQuery<{ data: IApiKey[] }>({
    queryKey: [QueryKeys.getApiKeys, currentEnvironment?._id],
    queryFn: async () => {
      if (!currentEnvironment) {
        throw new Error('No environment selected');
      }

      return getApiKeys({ environment: currentEnvironment });
    },
    enabled: !!currentEnvironment?._id && enabled,
  });

  return query;
};

export const useRegenerateApiKeys = () => {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!currentEnvironment) {
        throw new Error('No environment selected');
      }

      return regenerateApiKeys({ environment: currentEnvironment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.getApiKeys, currentEnvironment?._id],
      });
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.inboxSubscriberHash, currentEnvironment?._id],
      });
    },
  });
};

export const useCreateApiKey = () => {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!currentEnvironment) {
        throw new Error('No environment selected');
      }

      return createApiKey({ environment: currentEnvironment });
    },
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
    mutationFn: ({ hash }: { hash: string }) => {
      if (!currentEnvironment) {
        throw new Error('No environment selected');
      }

      return deleteApiKey({ environment: currentEnvironment, hash });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.getApiKeys, currentEnvironment?._id],
      });
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.inboxSubscriberHash, currentEnvironment?._id],
      });
    },
  });
};
