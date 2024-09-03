import { ChannelTypeEnum, IResponseError } from '@novu/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { errorMessage, successMessage } from '../utils/notifications';
import { QueryKeys } from '../api/query.keys';
import { useNovuAPI } from './useNovuAPI';

type ChannelPreference = {
  defaultValue: boolean;
  readOnly: boolean;
};

export type WorkflowChannelPreferences = {
  workflow: ChannelPreference;
  channels: {
    [key in (typeof ChannelTypeEnum)[keyof typeof ChannelTypeEnum]]: ChannelPreference;
  };
};

export const useWorkflowChannelPreferences = (
  workflowId: string
): {
  isLoading: boolean;
  isCreating: boolean;
  createWorkflowChannelPreferences: (data: WorkflowChannelPreferences) => void;
  workflowChannelPreferences: WorkflowChannelPreferences | undefined;
} => {
  const api = useNovuAPI();

  const {
    data: workflowChannelPreferences,
    isLoading,
    refetch,
  } = useQuery<WorkflowChannelPreferences>([QueryKeys.getWorkflowChannelPreferences(workflowId)], () =>
    api.getPreferences(workflowId as string)
  );

  const { mutateAsync: createWorkflowChannelPreferences, isLoading: isCreating } = useMutation<
    WorkflowChannelPreferences,
    IResponseError,
    WorkflowChannelPreferences
  >((data) => api.upsertPreferences(workflowId, data), {
    onSuccess: () => {
      refetch();
      successMessage('Workflow Channel Preferences created');
    },
    onError: () => {
      errorMessage('Failed to create Workflow Channel Preferences');
    },
  });

  return {
    isLoading,
    isCreating,
    createWorkflowChannelPreferences,
    workflowChannelPreferences,
  };
};
