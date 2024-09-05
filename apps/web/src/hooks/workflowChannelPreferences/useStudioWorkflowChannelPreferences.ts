import { useMemo } from 'react';
import { useDiscover } from '../../studio/hooks/useBridgeAPI';
import { WorkflowChannelPreferences } from './types';

export const useStudioWorkflowChannelPreferences = (
  workflowId: string
): {
  isLoading: boolean;
  workflowChannelPreferences: WorkflowChannelPreferences | undefined;
} => {
  const { data, isLoading } = useDiscover();

  const workflowChannelPreferences = useMemo(() => {
    return data?.workflows?.find((workflow) => workflow.workflowId === workflowId)?.preferences;
  }, [data, workflowId]);

  return {
    isLoading,
    workflowChannelPreferences,
  };
};
