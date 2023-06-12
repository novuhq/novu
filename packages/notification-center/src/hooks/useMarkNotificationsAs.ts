import { useMutation, useQueryClient, UseMutationOptions, InfiniteData } from '@tanstack/react-query';
import type { IMessage, IPaginatedResponse } from '@novu/shared';
import { IStoreQuery } from '@novu/client';

import { useNovuContext } from './useNovuContext';
import type { IMessageId } from '../shared/interfaces';
import { useFetchNotificationsQueryKey } from './useFetchNotificationsQueryKey';

interface IMarkNotificationsAsVariables {
  messageId: IMessageId;
  seen: boolean;
  read: boolean;
}

export const useMarkNotificationsAs = ({
  onSuccess,
  query,
  ...options
}: {
  onSuccess?: () => void;
  query?: IStoreQuery;
} & UseMutationOptions<IMessage[], Error, IMarkNotificationsAsVariables> = {}) => {
  const queryClient = useQueryClient();
  const { apiService } = useNovuContext();
  const fetchNotificationsQueryKey = useFetchNotificationsQueryKey();

  const { mutate, ...result } = useMutation<IMessage[], Error, IMarkNotificationsAsVariables>(
    ({ messageId, seen, read }) =>
      apiService.markMessageAs(messageId, {
        seen,
        read,
      }),
    {
      ...options,
      onSuccess: (newMessages, variables, context) => {
        queryClient.setQueriesData<InfiniteData<IPaginatedResponse<IMessage>>>(
          { queryKey: fetchNotificationsQueryKey, exact: false },
          (infiniteData) => {
            if (!infiniteData) {
              return;
            }

            const pages = infiniteData.pages.map((page) => {
              const data = page.data.map((message) => {
                const newMessage = newMessages.find((item) => item._id === message._id);
                if (newMessage) {
                  return newMessage;
                }

                return message;
              });

              return {
                ...page,
                data,
              };
            });

            return {
              pageParams: infiniteData.pageParams,
              pages,
            };
          }
        );
        onSuccess?.(newMessages, variables, context);
      },
    }
  );

  return { ...result, markNotificationsAs: mutate };
};
