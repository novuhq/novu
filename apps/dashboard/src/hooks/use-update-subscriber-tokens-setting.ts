import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateSubscriberTokensSetting } from '@/api/environments';
import { QueryKeys } from '@/utils/query-keys';

export function useUpdateSubscriberTokensSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSubscriberTokensSetting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.myEnvironments] });
    },
  });
}
