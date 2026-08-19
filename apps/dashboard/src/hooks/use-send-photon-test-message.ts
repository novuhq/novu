import { useMutation } from '@tanstack/react-query';
import { type SendPhotonTestMessageResponse, sendPhotonTestMessage } from '@/api/agents';
import { useEnvironment } from '@/context/environment/hooks';

type SendPhotonTestMessageVariables = {
  agentIdentifier: string;
  integrationIdentifier: string;
  subscriberId: string;
};

export function useSendPhotonTestMessage() {
  const { currentEnvironment } = useEnvironment();

  return useMutation<SendPhotonTestMessageResponse, Error, SendPhotonTestMessageVariables>({
    mutationFn: async ({ agentIdentifier, integrationIdentifier, subscriberId }) => {
      if (!currentEnvironment) {
        throw new Error('No environment selected');
      }

      return sendPhotonTestMessage(currentEnvironment, agentIdentifier, integrationIdentifier, subscriberId);
    },
  });
}
