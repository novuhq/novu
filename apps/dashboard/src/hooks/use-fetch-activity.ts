import { useQuery } from '@tanstack/react-query';
import { QueryKeys } from '@/utils/query-keys';
import type { IActivity } from '@novu/shared';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { getNotification, getWorkflowRun } from '@/api/activity';

export function useFetchActivity(
  { activityId }: { activityId?: string | null },
  {
    refetchInterval = false,
    refetchOnWindowFocus = false,
    staleTime = 0,
  }: { refetchInterval?: number | false; refetchOnWindowFocus?: boolean; staleTime?: number } = {}
) {
  const { currentEnvironment } = useEnvironment();
  const isWorkflowRunMigrationEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_WORKFLOW_RUN_PAGE_MIGRATION_ENABLED);

  const { data, isPending, error } = useQuery<IActivity>({
    queryKey: [QueryKeys.fetchActivity, currentEnvironment?._id, activityId, isWorkflowRunMigrationEnabled],
    queryFn: () => {
      if (isWorkflowRunMigrationEnabled) {
        return getWorkflowRun(activityId!, currentEnvironment!);
      }

      return getNotification(activityId!, currentEnvironment!);
    },
    enabled: !!currentEnvironment?._id && !!activityId,
    refetchInterval,
    refetchOnWindowFocus,
    staleTime,
  });

  return {
    activity: data,
    isPending,
    error,
  };
}
