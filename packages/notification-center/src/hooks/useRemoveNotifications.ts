import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';

import { useNovuContext } from './useNovuContext';
import { useFetchNotificationsQueryKey } from './useFetchNotificationsQueryKey';

interface IRemoveNotificationsVariables {
  messageIds: string[];
}

export type ResponseDataType = Record<string, never>;

export const useRemoveNotifications = ({
  onSuccess,
  ...options
}: {
  onSuccess?: () => void;
} & UseMutationOptions<ResponseDataType, Error, IRemoveNotificationsVariables> = {}) => {
  const queryClient = useQueryClient();
  const { apiService } = useNovuContext();
  const fetchNotificationsQueryKey = useFetchNotificationsQueryKey();

  const { mutate, ...result } = useMutation<ResponseDataType, Error, IRemoveNotificationsVariables>(
    ({ messageIds }) => apiService.removeMessages(messageIds),
    {
      ...options,
      onSuccess: (data, variables, context) => {
        queryClient.refetchQueries(fetchNotificationsQueryKey, { exact: false });
        onSuccess?.(data, variables, context);
      },
    }
  );

  return { ...result, removeNotifications: mutate };
};
