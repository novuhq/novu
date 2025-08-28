import { useEnvironment } from '@/context/environment/hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteIntegration as deleteIntegrationApi } from '../api/integrations';
import { QueryKeys } from '../utils/query-keys';

interface DeleteIntegrationResponse {
  acknowledged: boolean;
  status: number;
}

export function useDeleteIntegration() {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  const { mutateAsync: deleteIntegration, isPending: isLoading } = useMutation<
    DeleteIntegrationResponse,
    Error,
    { id: string }
  >({
    mutationFn: async ({ id }): Promise<DeleteIntegrationResponse> =>
      deleteIntegrationApi({ id, environment: currentEnvironment! }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchIntegrations, currentEnvironment?._id],
      });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchWorkflow, currentEnvironment?._id] });
    },
  });

  return { deleteIntegration, isLoading };
}
