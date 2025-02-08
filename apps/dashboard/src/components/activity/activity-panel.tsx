import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { RiPlayCircleLine, RiRouteFill } from 'react-icons/ri';
import { IActivityJob, JobStatusEnum } from '@novu/shared';

import { ActivityJobItem } from './activity-job-item';
import { InlineToast } from '../primitives/inline-toast';
import { useFetchActivity } from '@/hooks/use-fetch-activity';
import { ActivityOverview } from './components/activity-overview';
import { cn } from '../../utils/ui';
import { Skeleton } from '../primitives/skeleton';
import { QueryKeys } from '@/utils/query-keys';
import { useEnvironment } from '@/context/environment/hooks';

export interface ActivityPanelProps {
  activityId?: string;
  onActivitySelect: (activityId: string) => void;
  headerClassName?: string;
  overviewHeaderClassName?: string;
}

export function ActivityPanel({
  activityId,
  onActivitySelect,
  headerClassName,
  overviewHeaderClassName,
}: ActivityPanelProps) {
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

  if (isPending) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <LoadingSkeleton />
      </motion.div>
    );
  }

  if (error || !activity) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <div className="flex h-96 items-center justify-center border-t border-neutral-200">
          <div className="text-foreground-600 text-sm">Failed to load activity details</div>
        </div>
      </motion.div>
    );
  }

  const isMerged = activity.jobs.some((job) => job.status === 'merged');

  return (
    <motion.div
      key={activityId}
      initial={{ opacity: 0.7 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="h-full"
    >
      <div
        className={cn(
          'flex items-center gap-2 border-b border-t border-neutral-200 border-b-neutral-100 px-3 pb-2 pt-[7px]',
          headerClassName,
          overviewHeaderClassName
        )}
      >
        <RiRouteFill className="h-3 w-3" />
        <span className="text-foreground-950 text-sm font-medium">{activity.template?.name || 'Deleted workflow'}</span>
      </div>
      <ActivityOverview activity={activity} />

      <div className={cn('flex items-center gap-2 border-b border-t border-neutral-100 p-2 px-3', headerClassName)}>
        <RiPlayCircleLine className="h-3 w-3" />
        <span className="text-foreground-950 text-sm font-medium">Logs</span>
      </div>

      {isMerged && (
        <div className="px-3 py-3">
          <InlineToast
            ctaClassName="text-foreground-950"
            variant={'tip'}
            ctaLabel="View Execution"
            onCtaClick={(e) => {
              e.stopPropagation();
              e.preventDefault();

              if (activity._digestedNotificationId) {
                onActivitySelect(activity._digestedNotificationId);
              }
            }}
            description="Remaining execution has been merged to an active Digest of an existing workflow execution."
          />
        </div>
      )}
      <LogsSection jobs={activity.jobs} />
    </motion.div>
  );
}

function LogsSection({ jobs }: { jobs: IActivityJob[] }): JSX.Element {
  return (
    <div className="flex flex-col gap-6 bg-white p-3">
      {jobs.map((job, index) => (
        <ActivityJobItem key={job._id} job={job} isFirst={index === 0} isLast={index === jobs.length - 1} />
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div>
      <div className="flex items-center gap-2 border-b border-t border-neutral-200 border-b-neutral-100 p-2">
        <Skeleton className="h-3 w-3 rounded-full" />
        <Skeleton className="h-[20px] w-32" />
      </div>

      <div className="px-3 py-2">
        <div className="flex flex-col gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-t border-neutral-100 p-2">
        <Skeleton className="h-3 w-3 rounded-full" />
        <Skeleton className="h-4 w-16" />
      </div>

      <div className="flex flex-col gap-6 bg-white p-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
