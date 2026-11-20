import { useMutation, useQueryClient } from '@tanstack/react-query';
import { resetUsageLimits } from '@/api/billing';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

export const useResetUsageLimits = () => {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!currentEnvironment) {
        throw new Error('No environment selected');
      }

      return resetUsageLimits({ environment: currentEnvironment });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QueryKeys.billingSubscription] }),
  });
};
