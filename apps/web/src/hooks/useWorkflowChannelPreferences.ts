import { ChannelTypeEnum, IResponseError } from '@novu/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { QueryKeys } from '../api/query.keys';
import { useDiscover } from '../studio/hooks/useBridgeAPI';
import { useStudioState } from '../studio/StudioStateProvider';
import { errorMessage, successMessage } from '../utils/notifications';
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
  const { isLocalStudio } = useStudioState() || {};
  const { data: discoveryData, isLoading: discoveryLoading } = useDiscover({
    enabled: isLocalStudio,
  });

  const {
    data: cloudData,
    isLoading,
    refetch,
  } = useQuery<WorkflowChannelPreferences>(
    [QueryKeys.getWorkflowChannelPreferences(workflowId)],
    () => api.getPreferences(workflowId as string),
    { enabled: !isLocalStudio }
  );

  const workflowChannelPreferences = useMemo(() => {
    if (!isLocalStudio) {
      return cloudData;
    }

    return discoveryData?.workflows?.find((workflow) => workflow.workflowId === workflowId)?.preferences;
  }, [discoveryData, cloudData, isLocalStudio, workflowId]);

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
    isLoading: isLoading || discoveryLoading,
    isCreating,
    createWorkflowChannelPreferences,
    workflowChannelPreferences,
  };
};
