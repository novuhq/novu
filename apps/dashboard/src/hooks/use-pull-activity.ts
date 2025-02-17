import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { JobStatusEnum } from '@novu/shared';

import { useEnvironment } from '@/context/environment/hooks';
import { useFetchActivity } from '@/hooks/use-fetch-activity';
import { QueryKeys } from '@/utils/query-keys';

export const usePullActivity = (activityId?: string | null) => {
  const queryClient = useQueryClient();
  const [shouldRefetch, setShouldRefetch] = useState(true);
  const { currentEnvironment } = useEnvironment();
  const { activity, isPending, error } = useFetchActivity(
    { activityId },
    {
      refetchInterval: shouldRefetch ? 1000 : false,
    }
  );

  useEffect(() => {
    if (!activity) return;

    const isPending = activity.jobs?.some(
      (job) =>
        job.status === JobStatusEnum.PENDING ||
        job.status === JobStatusEnum.QUEUED ||
        job.status === JobStatusEnum.RUNNING ||
        job.status === JobStatusEnum.DELAYED
    );

    // Only stop refetching if we have an activity and it's not pending
    setShouldRefetch(isPending || !activity?.jobs?.length);

    queryClient.invalidateQueries({
      queryKey: [QueryKeys.fetchActivity, currentEnvironment?._id, activityId],
    });
  }, [activity, queryClient, currentEnvironment, activityId]);

  return {
    activity,
    isPending,
    error,
  };
};
