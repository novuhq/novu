import { useMutation } from '@tanstack/react-query';

import { updateVercelIntegration } from '@/api/partner-integrations';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { useEnvironment } from '@/context/environment/hooks';

export const useUpdateVercelIntegration = ({ next }: { next?: string | null }) => {
  const { currentEnvironment } = useEnvironment();

  return useMutation({
    mutationFn: ({ data, configurationId }: { data: Record<string, string[]>; configurationId: string }) =>
      updateVercelIntegration({ data, configurationId, environment: currentEnvironment }),
    onSuccess: () => {
      showSuccessToast('Vercel integration updated successfully');

      if (next) {
        window.location.replace(next);
      }
    },
    onError: (err: any) => {
      if (err?.message) {
        showErrorToast(`Failed to update Vercel integration: ${err?.message}`);
      }
    },
  });
};
