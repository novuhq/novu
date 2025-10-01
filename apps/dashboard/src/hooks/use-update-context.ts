import { ContextData, ContextId, ContextType } from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ContextResponseDto, updateContext } from '@/api/contexts';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

type UseUpdateContextProps = {
  onSuccess?: (data: ContextResponseDto) => void;
  onError?: (error: Error) => void;
};

export const useUpdateContext = ({ onSuccess, onError }: UseUpdateContextProps = {}) => {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();

  const { mutateAsync: updateContextMutation, isPending } = useMutation({
    mutationFn: ({ type, id, data }: { type: ContextType; id: ContextId; data: ContextData }) => {
      const environment = requireEnvironment(currentEnvironment, 'No environment available');

      return updateContext({
        environment,
        type,
        id,
        data,
      });
    },
    onSuccess: (data) => {
      // Invalidate contexts queries to refresh the list
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchContexts] });
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchContext, currentEnvironment?._id, data.type, data.id],
      });

      if (onSuccess) {
        onSuccess(data);
      }
    },
    onError: (error: Error) => {
      if (onError) {
        onError(error);
      }
    },
  });

  return {
    updateContext: updateContextMutation,
    isPending,
  };
};
