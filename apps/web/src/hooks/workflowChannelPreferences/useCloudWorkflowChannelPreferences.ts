import { useQuery } from '@tanstack/react-query';
import { WorkflowChannelPreferences } from '@novu/shared';
import { QueryKeys } from '../../api/query.keys';
import { useNovuAPI } from '../useNovuAPI';
import { DEFAULT_WORKFLOW_PREFERENCES } from '../../studio/components/workflows/preferences/WorkflowSubscriptionPreferences.const';
import { AxiosError, HttpStatusCode } from 'axios';

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
  } = useQuery<WorkflowChannelPreferences>([QueryKeys.getWorkflowChannelPreferences(workflowId)], async () => {
    try {
      const result = await api.getPreferences(workflowId as string);
      return result?.data;
    } catch (err: unknown) {
      if (!checkIsAxiosError(err) || err.response?.status !== HttpStatusCode.NotFound) {
        throw err;
      }

      // if preferences aren't found (404), use default so that user can modify them to upsert properly.
      return DEFAULT_WORKFLOW_PREFERENCES;
    }
  });

  return {
    isLoading,
    workflowChannelPreferences,
    refetch,
  };
};

function checkIsAxiosError(err: unknown): err is AxiosError {
  return typeof err === 'object' && !!err && 'name' in err && err.name === 'AxiosError';
}
