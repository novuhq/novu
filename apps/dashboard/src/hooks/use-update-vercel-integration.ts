import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateVercelIntegration } from '@/api/partner-integrations';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { useEnvironment } from '@/context/environment/hooks';

export const useUpdateVercelIntegration = ({ configurationId }: { configurationId?: string | null }) => {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ data, configurationId: configId }: { data: Record<string, string[]>; configurationId: string }) =>
      updateVercelIntegration({ data, configurationId: configId, environment: currentEnvironment }),
    onSuccess: () => {
      if (configurationId) {
        queryClient.invalidateQueries({ queryKey: ['configurationDetails', configurationId] });
      }

      showSuccessToast(
        'Novu credentials were added to Vercel. Redeploy production, then return to Vercel when you are done.',
        'Project linked'
      );
    },
    onError: (error: Error) => {
      if (error?.message) {
        showErrorToast(`Failed to update Vercel integration: ${error.message}`);
      }
    },
  });
};
