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
    mutationFn: (args: DisconnectStepResolverParameters) =>
      disconnectStepResolver({ environment: currentEnvironment!, ...args }),
    ...options,
    onSuccess: async (data, variables, ctx) => {
      await queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchWorkflow] });
      await queryClient.invalidateQueries({ queryKey: [QueryKeys.previewStep] });
      options?.onSuccess?.(data, variables, ctx);
    },
  });

  return {
    ...rest,
    disconnectStepResolver: mutateAsync,
  };
};
