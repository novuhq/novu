import { IResponseError, WorkflowPreferences } from '@novu/shared';
import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { useNovuAPI } from '../useNovuAPI';

export const useUpdateWorkflowPreferences = (
  workflowId: string,
  options: Omit<UseMutationOptions<WorkflowPreferences, IResponseError, WorkflowPreferences>, 'mutationFn'>
): {
  isLoading: boolean;
  updateWorkflowChannelPreferences: (data: WorkflowPreferences) => void;
} => {
  const api = useNovuAPI();

  const { mutateAsync: updateWorkflowChannelPreferences, isLoading } = useMutation<
    WorkflowPreferences,
    IResponseError,
    WorkflowPreferences
  >((data) => api.upsertPreferences(workflowId, data), {
    ...options,
  });

  return {
    isLoading,
    updateWorkflowChannelPreferences,
  };
};
