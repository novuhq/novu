import { useQuery } from '@tanstack/react-query';
import { buildWorkflowPreferences, WorkflowPreferences } from '@novu/shared';
import { AxiosError, HttpStatusCode } from 'axios';
import { QueryKeys } from '../../api/query.keys';
import { useNovuAPI } from '../useNovuAPI';

export const useCloudWorkflowPreferences = (
  workflowId: string
): {
  isLoading: boolean;
  workflowChannelPreferences: WorkflowPreferences | undefined;
  refetch: () => void;
} => {
  const api = useNovuAPI();

  const {
    data: workflowChannelPreferences,
    isLoading,
    refetch,
  } = useQuery<WorkflowPreferences>([QueryKeys.getWorkflowChannelPreferences(workflowId)], async () => {
    try {
      const result = await api.getPreferences(workflowId as string);

      return result?.data;
    } catch (err: unknown) {
      if (!checkIsAxiosError(err) || err.response?.status !== HttpStatusCode.NotFound) {
        throw err;
      }

      // if preferences aren't found (404), use default so that user can modify them to upsert properly.
      return buildWorkflowPreferences(undefined);
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
