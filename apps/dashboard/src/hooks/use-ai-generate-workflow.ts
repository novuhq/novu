import { useMutation, useQueryClient } from '@tanstack/react-query';
import { GenerateWorkflowResponse, generateWorkflow } from '@/api/ai';
import { showErrorToast, showSuccessToast } from '@/components/workflow-editor/toasts';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

type UseGenerateWorkflowOptions = {
  onSuccess?: (response: GenerateWorkflowResponse) => void;
  onError?: (error: Error) => void;
};

export function useAIGenerateWorkflow({ onSuccess, onError }: UseGenerateWorkflowOptions = {}) {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();

  const mutation = useMutation({
    mutationFn: (prompt: string) => {
      const environment = requireEnvironment(currentEnvironment, 'No current environment selected');

      return generateWorkflow({ environment, prompt });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchWorkflows, currentEnvironment?._id] });

      queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchTags, currentEnvironment?._id],
      });

      queryClient.invalidateQueries({
        queryKey: [QueryKeys.diffEnvironments],
      });

      showSuccessToast('Workflow generated successfully');

      onSuccess?.(result);
    },
    onError: (error: Error) => {
      showErrorToast('Failed to generate workflow', error);
      onError?.(error);
    },
  });

  return {
    aiGenerateWorkflow: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}
