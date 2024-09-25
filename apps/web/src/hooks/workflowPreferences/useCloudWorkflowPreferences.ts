import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { buildWorkflowPreferences, PreferencesTypeEnum, WorkflowPreferences } from '@novu/shared';
import { AxiosError, HttpStatusCode } from 'axios';
import { QueryKeys } from '../../api/query.keys';
import { useNovuAPI } from '../useNovuAPI';

export const useCloudWorkflowPreferences = (
  workflowId: string
): {
  isLoading: boolean;
  workflowUserPreferences: WorkflowPreferences | null;
  workflowResourcePreferences: WorkflowPreferences | null;
  refetch: () => void;
} => {
  const api = useNovuAPI();
  const [workflowUserPreferences, setWorkflowUserPreferences] = useState<WorkflowPreferences | null>(null);
  const [workflowResourcePreferences, setWorkflowResourcePreferences] = useState<WorkflowPreferences | null>(null);

  const { data, isLoading, refetch } = useQuery<{
    workflowUserPreferences: WorkflowPreferences;
    workflowResourcePreferences: WorkflowPreferences;
  }>([QueryKeys.getWorkflowPreferences(workflowId)], async () => {
    try {
      const result = await api.getPreferences(workflowId as string);

      return {
        workflowUserPreferences: result?.data?.source[PreferencesTypeEnum.USER_WORKFLOW],
        workflowResourcePreferences: result?.data?.source[PreferencesTypeEnum.WORKFLOW_RESOURCE],
      };
    } catch (err: unknown) {
      if (!checkIsAxiosError(err) || err.response?.status !== HttpStatusCode.NotFound) {
        throw err;
      }

      // if preferences aren't found (404), use default so that user can modify them to upsert properly.
      return {
        workflowUserPreferences: buildWorkflowPreferences(undefined),
        workflowResourcePreferences: buildWorkflowPreferences(undefined),
      };
    }
  });

  useEffect(() => {
    if (data) {
      setWorkflowUserPreferences(data.workflowUserPreferences);
      setWorkflowResourcePreferences(data.workflowResourcePreferences);
    }
  }, [data]);

  return {
    isLoading,
    workflowUserPreferences,
    workflowResourcePreferences,
    refetch,
  };
};

function checkIsAxiosError(err: unknown): err is AxiosError {
  return typeof err === 'object' && !!err && 'name' in err && err.name === 'AxiosError';
}
