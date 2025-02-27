import { motion } from 'motion/react';
import { RiPlayCircleLine } from 'react-icons/ri';
import { IActivity } from '@novu/shared';

import { cn } from '@/utils/ui';
import { InlineToast } from '@/components/primitives/inline-toast';
import { ActivityJobItem } from '@/components/activity/activity-job-item';
import { fadeIn } from '@/utils/animation';

export function ActivityLogs({
  activity,
  className,
  onActivitySelect,
  children,
}: {
  activity: IActivity;
  className?: string;
  onActivitySelect: (activityId: string) => void;
  children?: React.ReactNode;
}): JSX.Element {
  const isMerged = activity.jobs.some((job) => job.status === 'merged');
  const { jobs } = activity;

  return (
    <>
      <motion.div
        {...fadeIn}
        className={cn('flex items-center gap-2 border-b border-t border-neutral-100 p-2 px-3', className)}
      >
        <RiPlayCircleLine className="h-3 w-3" />
        <span className="text-foreground-950 text-sm font-medium">Logs</span>
      </motion.div>

      {isMerged && (
        <motion.div {...fadeIn} className="px-3 py-3">
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
        </motion.div>
      )}
      <motion.div {...fadeIn} className="flex flex-1 flex-col gap-6 overflow-y-auto bg-white p-3">
        {jobs.map((job, index) => (
          <ActivityJobItem key={job._id} job={job} isFirst={index === 0} isLast={index === jobs.length - 1} />
        ))}
        {children}
      </motion.div>
    </>
  );
}
