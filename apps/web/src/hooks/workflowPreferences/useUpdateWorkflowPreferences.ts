import { IResponseError, WorkflowPreferences } from '@novu/shared';
import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { useNovuAPI } from '../useNovuAPI';

export const useUpdateWorkflowPreferences = (
  workflowId: string,
  options: Omit<
    UseMutationOptions<WorkflowPreferences | null, IResponseError, WorkflowPreferences | null>,
    'mutationFn'
  >
): {
  isLoading: boolean;
  updateWorkflowPreferences: (data: WorkflowPreferences | null) => Promise<WorkflowPreferences | null>;
} => {
  const api = useNovuAPI();

  const { mutateAsync: updateWorkflowPreferences, isLoading } = useMutation<
    WorkflowPreferences | null,
    IResponseError,
    WorkflowPreferences | null
  >(
    (data) => {
      if (data === null) {
        return api.deletePreferences(workflowId);
      } else {
        return api.upsertPreferences(workflowId, data);
      }
    },
    { ...options }
  );

  return {
    isLoading,
    updateWorkflowPreferences,
  };
};
