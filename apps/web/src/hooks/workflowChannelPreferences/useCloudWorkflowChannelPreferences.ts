import { useQuery } from '@tanstack/react-query';
import { WorkflowChannelPreferences } from '@novu/shared';
import { QueryKeys } from '../../api/query.keys';
import { useNovuAPI } from '../useNovuAPI';

export const useCloudWorkflowChannelPreferences = (
  workflowId: string
): {
  isLoading: boolean;
  workflowChannelPreferences: WorkflowChannelPreferences | undefined;
  refetch: () => void;
} => {
  const api = useNovuAPI();

  const {
    data: workflowChannelPreferences,
    isLoading,
    refetch,
  } = useQuery<WorkflowChannelPreferences>(
    [QueryKeys.getWorkflowChannelPreferences(workflowId)],
    async () => (await api.getPreferences(workflowId as string))?.data
  );

  return {
    isLoading,
    workflowChannelPreferences,
    refetch,
  };
};
