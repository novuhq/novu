import { UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { createTopic } from '@/api/topics';
import { Topic } from '@/components/topics/types';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { OmitEnvironmentFromParameters } from '@/utils/types';

export type CreateTopicParameters = OmitEnvironmentFromParameters<typeof createTopic>;

export const useCreateTopic = (options?: UseMutationOptions<Topic, unknown, CreateTopicParameters>) => {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();

  const { mutateAsync, ...rest } = useMutation({
    mutationFn: (args: CreateTopicParameters) => createTopic({ environment: currentEnvironment!, ...args }),
    ...options,
    onSuccess: async (data, variables, ctx) => {
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchTopics],
      });

      options?.onSuccess?.(data, variables, ctx);
    },
  });

  return {
    ...rest,
    createTopic: mutateAsync,
  };
};
