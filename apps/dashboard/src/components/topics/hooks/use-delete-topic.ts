import { deleteTopic } from '@/api/topics';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { useEnvironment } from '@/context/environment/hooks';
import { useMutation } from '@tanstack/react-query';
import { ExternalToast } from 'sonner';

const toastOptions: ExternalToast = {
  position: 'bottom-right',
  classNames: {
    toast: 'mb-4 right-0',
  },
};

export const useDeleteTopic = () => {
  const { currentEnvironment } = useEnvironment();

  const { mutate, isPending } = useMutation({
    mutationFn: (topicKey: string) => {
      if (!currentEnvironment) {
        throw new Error('No environment selected');
      }

      return deleteTopic({
        environment: currentEnvironment,
        topicKey,
      });
    },
    onSuccess: () => {
      showSuccessToast('Topic deleted', 'The topic has been successfully deleted', toastOptions);
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
