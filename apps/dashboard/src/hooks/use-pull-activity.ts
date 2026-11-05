import { JobStatusEnum } from '@novu/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ActivityResponse } from '@/api/activity';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchActivity } from '@/hooks/use-fetch-activity';
import { QueryKeys } from '@/utils/query-keys';

export const usePullActivity = (activityId?: string | null) => {
  const queryClient = useQueryClient();
  const [shouldRefetch, setShouldRefetch] = useState(true);
  const [polledActivityId, setPolledActivityId] = useState(activityId);
  const { currentEnvironment } = useEnvironment();

  if (polledActivityId !== activityId) {
    setPolledActivityId(activityId);
    setShouldRefetch(true);
  }
  const { activity, isPending, isPlaceholderData, error } = useFetchActivity(
    { activityId },
    {
      refetchInterval: shouldRefetch ? 1000 : false,
    }
  );

  useEffect(() => {
    if (!activity || isPlaceholderData) return;

    const hasPendingJobs = activity.jobs?.some(
      (job) =>
        job.status === JobStatusEnum.PENDING ||
        job.status === JobStatusEnum.QUEUED ||
        job.status === JobStatusEnum.RUNNING ||
        job.status === JobStatusEnum.DELAYED
    );

    if (hasPendingJobs || !activity.jobs?.length) return;

    /**
     * Due to async inserts on the activity list, we want to provide 5 more seconds to refetch the activity
     * For any non-inserted traces.
     */
    const timeout = setTimeout(() => {
      setShouldRefetch(false);

      // invalidate that single activity in the activities list cache
      queryClient.setQueriesData(
        { queryKey: [QueryKeys.fetchActivities, currentEnvironment?._id] },
        (activityResponse: ActivityResponse | undefined) => {
          if (!activityResponse) return activityResponse;

          return {
            ...activityResponse,
            data: activityResponse.data.map((el) => {
              if (el._id === activity._id) {
                return { ...activity };
              }

              return el;
            }),
          };
        }
      );
    }, 5000);

    return () => clearTimeout(timeout);
  }, [activity, isPlaceholderData, queryClient, currentEnvironment]);

  return {
    activity,
    isPending,
    error,
  };
};
