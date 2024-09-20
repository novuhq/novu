import { useMemo } from 'react';
import { buildWorkflowPreferences, WorkflowPreferences } from '@novu/shared';
import { useDiscover } from '../../studio/hooks/useBridgeAPI';

export const useStudioWorkflowPreferences = (
  workflowId: string
): {
  isLoading: boolean;
  workflowChannelPreferences: WorkflowPreferences | undefined;
} => {
  const { data, isLoading } = useDiscover();

  const workflowChannelPreferences: WorkflowPreferences = useMemo(() => {
    const workflowPreference = data?.workflows?.find((workflow) => workflow.workflowId === workflowId)?.preferences;

    // if incomplete preferences are discovered from framework, populate the rest based on whatever is provided.
    return buildWorkflowPreferences(workflowPreference);
  }, [data, workflowId]);

  return {
    isLoading,
    workflowChannelPreferences,
  };
};
