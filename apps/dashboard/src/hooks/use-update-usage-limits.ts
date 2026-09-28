import type { UpdateUsageLimitsDto } from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateUsageLimits } from '@/api/billing';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

export const useUpdateUsageLimits = () => {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (usageLimits: UpdateUsageLimitsDto) => {
      if (!currentEnvironment) {
        throw new Error('No environment selected');
      }

      return updateUsageLimits({ environment: currentEnvironment, usageLimits });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QueryKeys.billingSubscription] }),
  });
};
