import { useMutation } from '@tanstack/react-query';
import { type SendWhatsAppTestTemplateResponse, sendWhatsAppTestTemplate } from '@/api/agents';
import { useEnvironment } from '@/context/environment/hooks';

type SendWhatsAppTestTemplateVariables = {
  agentIdentifier: string;
  integrationIdentifier: string;
  subscriberId: string;
};

export function useSendWhatsAppTestTemplate() {
  const { currentEnvironment } = useEnvironment();

  return useMutation<SendWhatsAppTestTemplateResponse, Error, SendWhatsAppTestTemplateVariables>({
    mutationFn: async ({ agentIdentifier, integrationIdentifier, subscriberId }) => {
      if (!currentEnvironment) {
        throw new Error('No environment selected');
      }

      return sendWhatsAppTestTemplate(currentEnvironment, agentIdentifier, integrationIdentifier, subscriberId);
    },
  });
}
