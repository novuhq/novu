import { IResponseError, WorkflowChannelPreferences } from '@novu/shared';
import { useMutation } from '@tanstack/react-query';
import { errorMessage, successMessage } from '../../utils/notifications';
import { useNovuAPI } from '../useNovuAPI';

export const useUpdateWorkflowChannelPreferences = (
  workflowId: string,
  onSuccess: () => void = () => {}
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
    onSuccess: () => {
      onSuccess();
      successMessage('Workflow Channel Preferences updated');
    },
    onError: () => {
      errorMessage('Failed to update Workflow Channel Preferences');
    },
  });

  return {
    isLoading,
    updateWorkflowChannelPreferences,
  };
};
