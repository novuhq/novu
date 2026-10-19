import { IIntegration } from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AutoConfigureIntegrationResponse, autoConfigureIntegration } from '../api/integrations';
import { showErrorToast, showSuccessToast } from '../components/primitives/sonner-helpers';
import { requireEnvironment, useEnvironment } from '../context/environment/hooks';
import { QueryKeys } from '../utils/query-keys';

type AutoConfigureIntegrationVariables = {
  integrationId: string;
};

export function useAutoConfigureIntegration() {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation<AutoConfigureIntegrationResponse, Error, AutoConfigureIntegrationVariables>({
    mutationFn: async ({ integrationId }) => {
      const environment = requireEnvironment(currentEnvironment, 'No environment available');
      return autoConfigureIntegration(integrationId, environment);
    },
    onSuccess: (data) => {
      if (data.success) {
        showSuccessToast(data.message || 'Integration auto-configured successfully', 'Configuration Complete');

        // Update integration data directly if available in response
        if (data.integration && currentEnvironment?._id) {
          queryClient.setQueryData<IIntegration[]>([QueryKeys.fetchIntegrations, currentEnvironment._id], (oldData) => {
            if (!oldData) return oldData;

            // Replace the existing integration with the updated one
            return oldData.map((integration) =>
              integration._id === data.integration?._id ? data.integration : integration
            );
          });
        } else {
          // Fallback to invalidation if no integration data in response
          queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchIntegrations, currentEnvironment?._id] });
        }
      } else {
        showErrorToast(data.message || 'Auto-configuration failed', 'Configuration Failed');
        // Still invalidate on failure to ensure consistent state
        queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchIntegrations, currentEnvironment?._id] });
      }

      // Always invalidate workflow queries as they might depend on integration changes
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchWorkflow, currentEnvironment?._id] });
    },
    onError: (error) => {
      showErrorToast(`Auto-configuration failed: ${error.message}`, 'Configuration Error');
    },
  });
}
