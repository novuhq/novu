import { useMutation, useQueryClient, UseMutationOptions, InfiniteData } from '@tanstack/react-query';
import { IMessage, ButtonTypeEnum, MessageActionStatusEnum, IPaginatedResponse } from '@novu/shared';

import { useNovuContext } from './useNovuContext';
import { INFINITE_NOTIFICATIONS_QUERY_KEY } from './queryKeys';

interface IUpdateActionVariables {
  messageId: string;
  actionButtonType: ButtonTypeEnum;
  status: MessageActionStatusEnum;
  payload?: Record<string, unknown>;
}

export const useUpdateAction = ({
  onSuccess,
  ...options
}: UseMutationOptions<IMessage, Error, IUpdateActionVariables> = {}) => {
  const queryClient = useQueryClient();
  const { apiService } = useNovuContext();

  const { mutate, ...result } = useMutation<IMessage, Error, IUpdateActionVariables>(
    (variables) =>
      apiService.updateAction(variables.messageId, variables.actionButtonType, variables.status, variables.payload),
    {
      ...options,
      onSuccess: (newMessage, variables, context) => {
        queryClient.setQueriesData<InfiniteData<IPaginatedResponse<IMessage>>>(
          { queryKey: INFINITE_NOTIFICATIONS_QUERY_KEY, exact: false },
          (infiniteData) => {
            const pages = infiniteData.pages.map((page) => {
              const data = page.data.map((message) => {
                if (message._id === variables.messageId) {
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
        onSuccess?.(newMessage, variables, context);
      },
    }
  );

  return { ...result, updateAction: mutate };
};
