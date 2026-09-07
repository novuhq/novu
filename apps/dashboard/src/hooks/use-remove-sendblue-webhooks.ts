import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAgentIntegrationsQueryKey,
  type RemoveSendblueWebhooksResponse,
  removeAgentSendblueWebhooks,
} from '@/api/agents';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

type RemoveSendblueWebhooksVariables = {
  agentIdentifier: string;
  integrationIdentifier: string;
  webhookUrls: string[];
};

export function useRemoveSendblueWebhooks() {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation<RemoveSendblueWebhooksResponse, Error, RemoveSendblueWebhooksVariables>({
    mutationFn: async ({ agentIdentifier, integrationIdentifier, webhookUrls }) => {
      if (!currentEnvironment) {
        throw new Error('No environment selected');
      }

      return removeAgentSendblueWebhooks(currentEnvironment, agentIdentifier, integrationIdentifier, webhookUrls);
    },
    onSuccess: (_result, { agentIdentifier }) => {
      queryClient.invalidateQueries({
        queryKey: getAgentIntegrationsQueryKey(currentEnvironment?._id, agentIdentifier),
      });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchIntegrations, currentEnvironment?._id] });
    },
  });
}
