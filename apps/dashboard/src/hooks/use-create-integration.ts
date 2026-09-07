import { IIntegration } from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createIntegration, CreateIntegrationData } from '../api/integrations';
import { useEnvironment } from '../context/environment/hooks';
import { QueryKeys } from '../utils/query-keys';

export function useCreateIntegration() {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation<{ data: IIntegration }, unknown, CreateIntegrationData>({
    mutationFn: (data: CreateIntegrationData) => createIntegration(data, currentEnvironment!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchIntegrations, currentEnvironment?._id] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchWorkflow, currentEnvironment?._id] });
    },
  });
}
