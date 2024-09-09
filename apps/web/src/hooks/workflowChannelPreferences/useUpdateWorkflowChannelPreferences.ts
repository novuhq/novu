import { IResponseError, WorkflowChannelPreferences } from '@novu/shared';
import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { useNovuAPI } from '../useNovuAPI';

export const useUpdateWorkflowChannelPreferences = (
  workflowId: string,
  options: Omit<
    UseMutationOptions<WorkflowChannelPreferences, IResponseError, WorkflowChannelPreferences>,
    'mutationFn'
  >
): {
  isLoading: boolean;
  updateWorkflowChannelPreferences: (data: WorkflowChannelPreferences) => void;
} => {
  const api = useNovuAPI();

  const { mutateAsync: updateWorkflowChannelPreferences, isLoading } = useMutation<
    WorkflowChannelPreferences,
    IResponseError,
    WorkflowChannelPreferences
  >((data) => api.upsertPreferences(workflowId, data), {
    ...options,
  });

  return {
    isLoading,
    updateWorkflowChannelPreferences,
  };
};
