import { useMutation } from '@tanstack/react-query';
import { type SendSendblueTestMessageResponse, sendSendblueTestMessage } from '@/api/agents';
import { useEnvironment } from '@/context/environment/hooks';

type SendSendblueTestMessageVariables = {
  agentIdentifier: string;
  integrationIdentifier: string;
  subscriberId: string;
};

export function useSendSendblueTestMessage() {
  const { currentEnvironment } = useEnvironment();

  return useMutation<SendSendblueTestMessageResponse, Error, SendSendblueTestMessageVariables>({
    mutationFn: async ({ agentIdentifier, integrationIdentifier, subscriberId }) => {
      if (!currentEnvironment) {
        throw new Error('No environment selected');
      }

      return sendSendblueTestMessage(currentEnvironment, agentIdentifier, integrationIdentifier, subscriberId);
    },
  });
}
