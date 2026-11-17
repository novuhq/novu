import { JobStatusEnum } from '@novu/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ActivityResponse } from '@/api/activity';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchActivity } from '@/hooks/use-fetch-activity';
import { QueryKeys } from '@/utils/query-keys';

const ACTIVE_REFETCH_INTERVAL_MS = 1000;
const SETTLED_REFETCH_INTERVAL_MS = 10_000;
const SETTLE_GRACE_PERIOD_MS = 5000;

const IN_FLIGHT_JOB_STATUSES: string[] = [
  JobStatusEnum.PENDING,
  JobStatusEnum.QUEUED,
  JobStatusEnum.RUNNING,
  JobStatusEnum.DELAYED,
];

export const usePullActivity = (activityId?: string | null) => {
  const queryClient = useQueryClient();
  const [refetchInterval, setRefetchInterval] = useState<number | false>(ACTIVE_REFETCH_INTERVAL_MS);
  const [polledActivityId, setPolledActivityId] = useState(activityId);
  const { currentEnvironment } = useEnvironment();

  if (polledActivityId !== activityId) {
    setPolledActivityId(activityId);
    setRefetchInterval(ACTIVE_REFETCH_INTERVAL_MS);
  }

  const { activity, isPending, isPlaceholderData, error } = useFetchActivity({ activityId }, { refetchInterval });

  useEffect(() => {
    if (!activity || isPlaceholderData) return;

    const hasInFlightJobs = activity.jobs?.some((job) => IN_FLIGHT_JOB_STATUSES.includes(job.status));

    if (hasInFlightJobs || !activity.jobs?.length) {
      setRefetchInterval(ACTIVE_REFETCH_INTERVAL_MS);

      return;
    }

    /**
     * Due to async inserts on the activity list, we want to provide 5 more seconds to refetch the activity
     * For any non-inserted traces.
     */
    const timeout = setTimeout(() => {
      /**
       * A settled run still changes: recipients read or interact with its messages and providers report delivery
       * later, each written as a new step trace, and a merged follower resumes when its master digest is canceled.
       * Keep polling the open run, just slower.
       */
      setRefetchInterval(SETTLED_REFETCH_INTERVAL_MS);

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
    }, SETTLE_GRACE_PERIOD_MS);

    return () => clearTimeout(timeout);
  }, [activity, isPlaceholderData, queryClient, currentEnvironment]);

  return {
    activity,
    isPending,
    isPlaceholderData,
    error,
  };
};
