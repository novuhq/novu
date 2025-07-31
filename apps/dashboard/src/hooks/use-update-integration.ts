import { IIntegration } from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UpdateIntegrationData, updateIntegration } from '../api/integrations';
import { useEnvironment } from '../context/environment/hooks';
import { QueryKeys } from '../utils/query-keys';

type UpdateIntegrationVariables = {
  integrationId: string;
  data: UpdateIntegrationData;
};

export function useUpdateIntegration() {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation<IIntegration, Error, UpdateIntegrationVariables>({
    mutationFn: async ({ integrationId, data }) => {
      return updateIntegration(integrationId, data, currentEnvironment!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchIntegrations, currentEnvironment?._id] });
    },
  });
}
