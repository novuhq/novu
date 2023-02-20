import { useMutation, useQueryClient, UseMutationOptions, InfiniteData } from '@tanstack/react-query';
import type { IMessage, IPaginatedResponse } from '@novu/shared';

import { useNovuContext } from './useNovuContext';
import { INFINITE_NOTIFICATIONS_QUERY_KEY, FEED_UNSEEN_COUNT_QUERY_KEY, UNSEEN_COUNT_QUERY_KEY } from './queryKeys';

interface IMarkNotificationsAsReadVariables {
  feedId: string;
}

export const useMarkNotificationsAsReadByFeed = ({
  onSuccess,
  ...options
}: UseMutationOptions<IMessage[], Error, IMarkNotificationsAsReadVariables> = {}) => {
  const queryClient = useQueryClient();
  const { apiService } = useNovuContext();

  const { mutate, ...result } = useMutation<IMessage[], Error, IMarkNotificationsAsReadVariables>(
    ({ feedId }) => apiService.markAllMessageAsRead(feedId),
    {
      ...options,
      onSuccess: (responseData, variables, context) => {
        queryClient.setQueriesData<InfiniteData<IPaginatedResponse<IMessage>>>(
          { queryKey: INFINITE_NOTIFICATIONS_QUERY_KEY, exact: false },
          (infiniteData) => {
            const pages = infiniteData.pages.map((page) => {
              const data = page.data.map((message) => {
                return { ...message, read: true, seen: true };
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
        queryClient.refetchQueries(INFINITE_NOTIFICATIONS_QUERY_KEY, {
          exact: false,
        });
        queryClient.refetchQueries(FEED_UNSEEN_COUNT_QUERY_KEY, {
          exact: false,
        });
        queryClient.refetchQueries(UNSEEN_COUNT_QUERY_KEY, {
          exact: false,
        });
        onSuccess?.(responseData, variables, context);
      },
    }
  );

  return { ...result, markNotificationsAsReadByFeed: mutate };
};
