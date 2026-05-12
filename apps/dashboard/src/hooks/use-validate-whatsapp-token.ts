import { useMutation } from '@tanstack/react-query';
import { validateWhatsAppToken, type WhatsAppValidateTokenResponse } from '@/api/agents';
import { useEnvironment } from '@/context/environment/hooks';

type ValidateWhatsAppTokenVariables = {
  accessToken: string;
  phoneNumberIdentification?: string;
  businessAccountId?: string;
  signal?: AbortSignal;
};

export function useValidateWhatsAppToken() {
  const { currentEnvironment } = useEnvironment();

  return useMutation<WhatsAppValidateTokenResponse, Error, ValidateWhatsAppTokenVariables>({
    mutationFn: async ({ accessToken, phoneNumberIdentification, businessAccountId, signal }) => {
      if (!currentEnvironment) {
        throw new Error('No environment selected');
      }

      return validateWhatsAppToken(
        currentEnvironment,
        { accessToken, phoneNumberIdentification, businessAccountId },
        signal
      );
    },
  });
}
