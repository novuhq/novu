import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import type { IMessage } from '@novu/shared';
import { IStoreQuery } from '@novu/client';

import { useNovuContext } from './useNovuContext';
import { INFINITE_NOTIFICATIONS_QUERY_KEY } from './queryKeys';
import { useSetQueryKey } from './useSetQueryKey';

interface IRemoveNotificationVariables {
  messageId: string;
}

export const useRemoveNotification = ({
  onSuccess,
  query,
  ...options
}: {
  onSuccess?: () => void;
  query?: IStoreQuery;
} & UseMutationOptions<IMessage, Error, IRemoveNotificationVariables> = {}) => {
  const queryClient = useQueryClient();
  const { apiService } = useNovuContext();
  const setQueryKey = useSetQueryKey();

  const { mutate, ...result } = useMutation<IMessage, Error, IRemoveNotificationVariables>(
    ({ messageId }) => apiService.removeMessage(messageId),
    {
      ...options,
      onSuccess: (data, variables, context) => {
        queryClient.refetchQueries(setQueryKey([...INFINITE_NOTIFICATIONS_QUERY_KEY, query]), { exact: false });
        onSuccess?.(data, variables, context);
      },
    }
  );

  return { ...result, removeNotification: mutate };
};
