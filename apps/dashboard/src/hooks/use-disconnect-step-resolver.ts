import { UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { disconnectStepResolver } from '@/api/step-resolvers';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { OmitEnvironmentFromParameters } from '@/utils/types';

type DisconnectStepResolverParameters = OmitEnvironmentFromParameters<typeof disconnectStepResolver>;

export const useDisconnectStepResolver = (
  options?: UseMutationOptions<void, unknown, DisconnectStepResolverParameters>
) => {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();

  const { mutateAsync, ...rest } = useMutation({
    mutationFn: (args: DisconnectStepResolverParameters) => {
      if (!currentEnvironment) {
        return Promise.reject(new Error('No environment loaded'));
      }

      return disconnectStepResolver({ environment: currentEnvironment, ...args });
    },
    ...options,
    onSuccess: async (data, variables, ctx) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchWorkflow] }),
        queryClient.invalidateQueries({ queryKey: [QueryKeys.previewStep] }),
        queryClient.invalidateQueries({ queryKey: [QueryKeys.diffEnvironments] }),
        queryClient.invalidateQueries({ queryKey: [QueryKeys.stepResolversCount] }),
      ]);
      options?.onSuccess?.(data, variables, ctx);
    },
  });

  return {
    ...rest,
    disconnectStepResolver: mutateAsync,
  };
};
