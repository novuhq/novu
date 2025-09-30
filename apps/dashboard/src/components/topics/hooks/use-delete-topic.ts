import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ExternalToast } from 'sonner';
import { deleteTopic } from '@/api/topics';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

const toastOptions: ExternalToast = {
  position: 'bottom-right',
  classNames: {
    toast: 'mb-4 right-0',
  },
};

export const useDeleteTopic = () => {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: (topicKey: string) => {
      const environment = requireEnvironment(currentEnvironment, 'No environment selected');

      return deleteTopic({
        environment,
        topicKey,
      });
    },
    onSuccess: () => {
      showSuccessToast('Topic deleted', 'The topic has been successfully deleted', toastOptions);

      // Invalidate the topics query to refresh the list
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchTopics],
        exact: false,
        refetchType: 'all',
      });
    },
    onError: (error: Error) => {
      showErrorToast(
        error.message || 'Something went wrong while deleting the topic',
        'Error deleting topic',
        toastOptions
      );
    },
  });

  return {
    deleteTopic: mutate,
    isDeleting: isPending,
  };
};
