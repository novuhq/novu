import { useQuery } from '@tanstack/react-query';
import { QueryKeys } from '../../api/query.keys';
import { useNovuAPI } from '../useNovuAPI';
import { WorkflowChannelPreferences } from './types';

export const useCloudWorkflowChannelPreferences = (
  workflowId: string
): {
  isLoading: boolean;
  workflowChannelPreferences: WorkflowChannelPreferences | undefined;
} => {
  const api = useNovuAPI();

  const { data: workflowChannelPreferences, isLoading } = useQuery<WorkflowChannelPreferences>(
    [QueryKeys.getWorkflowChannelPreferences(workflowId)],
    () => api.getPreferences(workflowId as string)
  );

  return {
    isLoading,
    workflowChannelPreferences,
  };
};
