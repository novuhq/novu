import { useQuery } from '@tanstack/react-query';
import { buildWorkflowPreferences, PreferencesTypeEnum, WorkflowPreferences } from '@novu/shared';
import { AxiosError, HttpStatusCode } from 'axios';
import { QueryKeys } from '../../api/query.keys';
import { useNovuAPI } from '../useNovuAPI';

export const useCloudWorkflowPreferences = (
  workflowId: string
): {
  isLoading: boolean;
  workflowChannelPreferences: WorkflowPreferences | undefined;
  hasWorkflowPreferences: boolean | undefined;
  refetch: () => void;
} => {
  const api = useNovuAPI();

  const { data, isLoading, refetch } = useQuery<{ preferences: WorkflowPreferences; hasWorkflowPreferences: boolean }>(
    [QueryKeys.getWorkflowPreferences(workflowId)],
    async () => {
      try {
        const result = await api.getPreferences(workflowId as string);

        return {
          preferences: result?.data?.preferences,
          hasWorkflowPreferences: result?.data?.type === PreferencesTypeEnum.USER_WORKFLOW,
        };
      } catch (err: unknown) {
        if (!checkIsAxiosError(err) || err.response?.status !== HttpStatusCode.NotFound) {
          throw err;
        }

        // if preferences aren't found (404), use default so that user can modify them to upsert properly.
        return {
          preferences: buildWorkflowPreferences(undefined),
          hasWorkflowPreferences: false,
        };
      }
    }
  );

  return {
    isLoading,
    workflowChannelPreferences: data?.preferences,
    hasWorkflowPreferences: data?.hasWorkflowPreferences,
    refetch,
  };
};

function checkIsAxiosError(err: unknown): err is AxiosError {
  return typeof err === 'object' && !!err && 'name' in err && err.name === 'AxiosError';
}
