import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEnvironment } from '../context/environment/hooks';
import { setAsPrimaryIntegration } from '../api/integrations';
import { QueryKeys } from '../utils/query-keys';

type SetPrimaryIntegrationParams = {
  integrationId: string;
};

export function useSetPrimaryIntegration() {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ integrationId }: SetPrimaryIntegrationParams) => {
      return setAsPrimaryIntegration(integrationId, currentEnvironment!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchIntegrations, currentEnvironment?._id] });
    },
  });
}
