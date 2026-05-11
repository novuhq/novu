import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type ConfigureWhatsAppWebhookResponse,
  configureAgentWhatsAppWebhook,
  getAgentIntegrationsQueryKey,
} from '@/api/agents';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

type ConfigureWhatsAppWebhookVariables = {
  agentIdentifier: string;
  integrationIdentifier: string;
};

export function useConfigureWhatsAppWebhook() {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation<ConfigureWhatsAppWebhookResponse, Error, ConfigureWhatsAppWebhookVariables>({
    mutationFn: async ({ agentIdentifier, integrationIdentifier }) => {
      if (!currentEnvironment) {
        throw new Error('No environment selected');
      }

      return configureAgentWhatsAppWebhook(currentEnvironment, agentIdentifier, integrationIdentifier);
    },
    onSuccess: (result, { agentIdentifier }) => {
      if (result.success) {
        queryClient.invalidateQueries({
          queryKey: getAgentIntegrationsQueryKey(currentEnvironment?._id, agentIdentifier),
        });
        queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchIntegrations, currentEnvironment?._id] });
      }
    },
  });
}
