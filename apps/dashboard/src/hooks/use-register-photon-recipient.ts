import { useMutation } from '@tanstack/react-query';
import { registerPhotonRecipient, type RegisterPhotonRecipientResponse } from '@/api/agents';
import { useEnvironment } from '@/context/environment/hooks';

type RegisterPhotonRecipientVariables = {
  agentIdentifier: string;
  integrationIdentifier: string;
  phoneNumber: string;
  email?: string;
};

export function useRegisterPhotonRecipient() {
  const { currentEnvironment } = useEnvironment();

  return useMutation<RegisterPhotonRecipientResponse, Error, RegisterPhotonRecipientVariables>({
    mutationFn: async ({ agentIdentifier, integrationIdentifier, phoneNumber, email }) => {
      if (!currentEnvironment) {
        throw new Error('No environment selected');
      }

      return registerPhotonRecipient(currentEnvironment, agentIdentifier, integrationIdentifier, {
        phoneNumber,
        email,
      });
    },
  });
}
