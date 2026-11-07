import type { IActivity } from '@novu/shared';
import { FeatureFlagsKeysEnum, StepTypeEnum } from '@novu/shared';
import { type QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ActivityResponse, getNotification, getWorkflowRun } from '@/api/activity';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { QueryKeys } from '@/utils/query-keys';

function findListedActivity(
  queryClient: QueryClient,
  environmentId: string | undefined,
  activityId: string | null | undefined
): IActivity | undefined {
  if (!environmentId || !activityId) {
    return undefined;
  }

  const lists = queryClient.getQueriesData<ActivityResponse>({ queryKey: [QueryKeys.fetchActivities, environmentId] });

  for (const [, list] of lists) {
    const listedActivity = list?.data.find((item) => item._id === activityId);

    if (listedActivity) {
      return isRenderableAsDetail(listedActivity) ? listedActivity : undefined;
    }
  }

  return undefined;
}

/** The job item reads `digest.timed` on digest steps without a guard, and workflow run list rows carry no digest. */
function isRenderableAsDetail(activity: IActivity): boolean {
  return activity.jobs.every((job) => job.type !== StepTypeEnum.DIGEST || Boolean(job.digest));
}

export function useFetchActivity(
  { activityId }: { activityId?: string | null },
  {
    refetchInterval = false,
    refetchOnWindowFocus = false,
    staleTime = 0,
  }: { refetchInterval?: number | false; refetchOnWindowFocus?: boolean; staleTime?: number } = {}
) {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();
  const isWorkflowRunMigrationEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_WORKFLOW_RUN_PAGE_MIGRATION_ENABLED);

  const { data, isPending, isPlaceholderData, error } = useQuery<IActivity>({
    queryKey: [QueryKeys.fetchActivity, currentEnvironment?._id, activityId, isWorkflowRunMigrationEnabled],
    queryFn: () => {
      if (!activityId || !currentEnvironment) {
        return Promise.reject(new Error('An activity id and environment are required'));
      }

      if (isWorkflowRunMigrationEnabled) {
        return getWorkflowRun(activityId, currentEnvironment);
      }

      return getNotification(activityId, currentEnvironment);
    },
    // Render the row from the list while the full run loads, instead of a skeleton on every selection.
    placeholderData: () => findListedActivity(queryClient, currentEnvironment?._id, activityId),
    enabled: !!currentEnvironment?._id && !!activityId,
    refetchInterval,
    refetchOnWindowFocus,
    staleTime,
  });

  return {
    activity: data,
    isPending,
    isPlaceholderData,
    error,
  };
}
