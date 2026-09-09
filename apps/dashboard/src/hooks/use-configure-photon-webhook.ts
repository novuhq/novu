import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type ConfigurePhotonWebhookResponse,
  configureAgentPhotonWebhook,
  getAgentIntegrationsQueryKey,
} from '@/api/agents';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

type ConfigurePhotonWebhookVariables = {
  agentIdentifier: string;
  integrationIdentifier: string;
  /** Recreate the registration for a fresh signing secret even when one is already stored. */
  force?: boolean;
};

export function useConfigurePhotonWebhook() {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation<ConfigurePhotonWebhookResponse, Error, ConfigurePhotonWebhookVariables>({
    mutationFn: async ({ agentIdentifier, integrationIdentifier, force }) => {
      if (!currentEnvironment) {
        throw new Error('No environment selected');
      }

      return configureAgentPhotonWebhook(currentEnvironment, agentIdentifier, integrationIdentifier, { force });
    },
    onSuccess: (_result, { agentIdentifier }) => {
      // The Photon-issued signing secret lands on the integration credentials, so refresh both.
      queryClient.invalidateQueries({
        queryKey: getAgentIntegrationsQueryKey(currentEnvironment?._id, agentIdentifier),
      });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchIntegrations, currentEnvironment?._id] });
    },
  });
}
