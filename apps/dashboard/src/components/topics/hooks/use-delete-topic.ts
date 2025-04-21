import { deleteTopic } from '@/api/topics';
import { useEnvironment } from '@/context/environment/hooks';
import { useToast } from '@/hooks/use-toast';
import { QueryKeys } from '@/utils/query-keys';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useDeleteTopic = () => {
  const { currentEnvironment } = useEnvironment();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: (topicId: string) => {
      if (!currentEnvironment) {
        throw new Error('No environment selected');
      }

      return deleteTopic({
        environment: currentEnvironment,
        topicId,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Topic deleted',
        description: 'The topic has been successfully deleted',
        variant: 'success',
      });

      return queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchTopics, currentEnvironment?._id],
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting topic',
        description: error.message || 'Something went wrong while deleting the topic',
        variant: 'error',
      });
    },
  });

  return {
    deleteTopic: mutate,
    isDeleting: isPending,
  };
};
