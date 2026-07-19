import { useMutation } from '@tanstack/react-query';
import { completeWhatsAppEmbeddedSignup, type WhatsAppEmbeddedSignupParams } from '@/api/integrations';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';

export function useWhatsAppEmbeddedSignup() {
  const { currentEnvironment } = useEnvironment();

  return useMutation({
    mutationFn: (params: WhatsAppEmbeddedSignupParams) => {
      const environment = requireEnvironment(currentEnvironment, 'No environment selected');

      return completeWhatsAppEmbeddedSignup(params, environment);
    },
  });
}
