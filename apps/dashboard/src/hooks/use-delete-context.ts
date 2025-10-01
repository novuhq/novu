import { ContextId, ContextType } from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteContext } from '@/api/contexts';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

export const useDeleteContext = () => {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: ({ type, id }: { type: ContextType; id: ContextId }) => {
      const environment = requireEnvironment(currentEnvironment, 'No environment available');

      return deleteContext({
        environment,
        type,
        id,
      });
    },
    onSuccess: (_, variables) => {
      // Remove the specific context from cache
      queryClient.removeQueries({
        queryKey: [QueryKeys.fetchContext, currentEnvironment?._id, variables.type, variables.id],
        exact: true,
      });

      // Invalidate all contexts queries to refresh the list
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchContexts],
        exact: false,
        refetchType: 'all',
      });
    },
  });

  return {
    deleteContext: mutate,
    isDeleting: isPending,
  };
};
