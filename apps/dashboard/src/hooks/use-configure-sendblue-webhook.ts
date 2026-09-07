import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type ConfigureSendblueWebhookResponse,
  configureAgentSendblueWebhook,
  getAgentIntegrationsQueryKey,
} from '@/api/agents';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

type ConfigureSendblueWebhookVariables = {
  agentIdentifier: string;
  integrationIdentifier: string;
};

export function useConfigureSendblueWebhook() {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation<ConfigureSendblueWebhookResponse, Error, ConfigureSendblueWebhookVariables>({
    mutationFn: async ({ agentIdentifier, integrationIdentifier }) => {
      if (!currentEnvironment) {
        throw new Error('No environment selected');
      }

      return configureAgentSendblueWebhook(currentEnvironment, agentIdentifier, integrationIdentifier);
    },
    onSuccess: (result, { agentIdentifier }) => {
      // The webhook secret is persisted even on manual fallback, so refresh in both cases.
      queryClient.invalidateQueries({
        queryKey: getAgentIntegrationsQueryKey(currentEnvironment?._id, agentIdentifier),
      });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchIntegrations, currentEnvironment?._id] });
    },
  });
}
