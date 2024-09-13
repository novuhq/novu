import { useMemo } from 'react';
import { useDiscover } from '../../studio/hooks/useBridgeAPI';
import { buildWorkflowChannelPreferences, WorkflowChannelPreferences } from '@novu/shared';

export const useStudioWorkflowChannelPreferences = (
  workflowId: string
): {
  isLoading: boolean;
  workflowChannelPreferences: WorkflowChannelPreferences | undefined;
} => {
  const { data, isLoading } = useDiscover();

  const workflowChannelPreferences: WorkflowChannelPreferences = useMemo(() => {
    const workflowPreference = data?.workflows?.find((workflow) => workflow.workflowId === workflowId)?.preferences;

    // if incomplete preferences are discovered from framework, populate the rest based on whatever is provided.
    return buildWorkflowChannelPreferences(workflowPreference);
  }, [data, workflowId]);

  return {
    isLoading,
    workflowChannelPreferences,
  };
};
