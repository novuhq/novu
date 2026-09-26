import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAgentIntegrationsQueryKey,
  type RemovePhotonWebhooksResponse,
  removeAgentPhotonWebhooks,
} from '@/api/agents';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

type RemovePhotonWebhooksVariables = {
  agentIdentifier: string;
  integrationIdentifier: string;
  webhookUrls: string[];
};

export function useRemovePhotonWebhooks() {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation<RemovePhotonWebhooksResponse, Error, RemovePhotonWebhooksVariables>({
    mutationFn: async ({ agentIdentifier, integrationIdentifier, webhookUrls }) => {
      if (!currentEnvironment) {
        throw new Error('No environment selected');
      }

      return removeAgentPhotonWebhooks(currentEnvironment, agentIdentifier, integrationIdentifier, webhookUrls);
    },
    onSuccess: (_result, { agentIdentifier }) => {
      queryClient.invalidateQueries({
        queryKey: getAgentIntegrationsQueryKey(currentEnvironment?._id, agentIdentifier),
      });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchIntegrations, currentEnvironment?._id] });
    },
  });
}
