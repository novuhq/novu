import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AutoConfigureIntegrationResponse, autoConfigureIntegration } from '../api/integrations';
import { showErrorToast, showSuccessToast } from '../components/primitives/sonner-helpers';
import { useEnvironment } from '../context/environment/hooks';
import { QueryKeys } from '../utils/query-keys';

type AutoConfigureIntegrationVariables = {
  integrationId: string;
};

export function useAutoConfigureIntegration() {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation<AutoConfigureIntegrationResponse, Error, AutoConfigureIntegrationVariables>({
    mutationFn: async ({ integrationId }) => {
      if (!currentEnvironment) {
        throw new Error('No environment available');
      }
      return autoConfigureIntegration(integrationId, currentEnvironment);
    },
    onSuccess: (data) => {
      if (data.success) {
        showSuccessToast(data.message || 'Integration auto-configured successfully', 'Configuration Complete');
      } else {
        showErrorToast(data.message || 'Auto-configuration failed', 'Configuration Failed');
      }

      // Invalidate queries to refresh integration data
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchIntegrations, currentEnvironment?._id] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchWorkflow, currentEnvironment?._id] });
    },
    onError: (error) => {
      showErrorToast(`Auto-configuration failed: ${error.message}`, 'Configuration Error');
    },
  });
}
