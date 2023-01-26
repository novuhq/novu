import { useMutation, useQueryClient, UseMutationOptions, InfiniteData } from '@tanstack/react-query';
import type { IMessage, IPaginatedResponse } from '@novu/shared';

import { useNovuContext } from './useNovuContext';
import { INFINITE_NOTIFICATIONS_QUERY_KEY } from './queryKeys';
import type { IMessageId } from '../shared/interfaces';

interface IMarkNotificationsAsVariables {
  messageId: IMessageId;
  seen: boolean;
  read: boolean;
}

export const useMarkNotificationsAs = ({
  onSuccess,
  ...options
}: UseMutationOptions<IMessage[], Error, IMarkNotificationsAsVariables> = {}) => {
  const queryClient = useQueryClient();
  const { apiService } = useNovuContext();

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
          { queryKey: INFINITE_NOTIFICATIONS_QUERY_KEY, exact: false },
          (infiniteData) => {
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
