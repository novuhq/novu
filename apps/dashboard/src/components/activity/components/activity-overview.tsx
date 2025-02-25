import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { IActivity } from '@novu/shared';

import { SubscriberDrawerButton } from '@/components/subscribers/subscriber-drawer';
import { TimeDisplayHoverCard } from '@/components/time-display-hover-card';
import { useEnvironment } from '@/context/environment/hooks';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { JOB_STATUS_CONFIG } from '../constants';
import { OverviewItem } from './overview-item';
import { fadeIn } from '@/utils/animation';

export interface ActivityOverviewProps {
  activity: IActivity;
}

export function ActivityOverview({ activity }: ActivityOverviewProps) {
  const { currentEnvironment } = useEnvironment();
  const status = activity.jobs[activity?.jobs?.length - 1]?.status;

  const workflowPath = buildRoute(ROUTES.EDIT_WORKFLOW, {
    environmentSlug: currentEnvironment?.slug ?? '',
    workflowSlug: activity?.template?._id ?? '',
  });

  return (
    <motion.div {...fadeIn} className="px-3 py-2">
      <div className="mb-2 flex flex-col gap-[14px]">
        <OverviewItem label="Workflow Identifier" value={activity.template?.name || 'Deleted workflow'}>
          <Link
            to={activity.template?._id ? workflowPath : '#'}
            className={cn('text-foreground-600 cursor-pointer font-mono text-xs group-hover:underline', {
              'text-foreground-300 cursor-not-allowed': !activity.template?._id,
            })}
          >
            {activity.template?.name || 'Deleted workflow'}
          </Link>
        </OverviewItem>

        <OverviewItem label="Transaction ID" value={activity.transactionId} isCopyable />

        <SubscriberDrawerButton
          disabled={!activity.subscriber}
          className="text-start"
          subscriberId={activity.subscriber?.subscriberId || activity._subscriberId}
          readOnly={true}
        >
          <OverviewItem
            label="Subscriber ID"
            isDeleted={!activity.subscriber}
            value={(activity.subscriber?.subscriberId || activity._subscriberId) ?? ''}
            isCopyable
          />
        </SubscriberDrawerButton>

        <OverviewItem label="Triggered at" value={format(new Date(activity.createdAt), 'MMM d yyyy, HH:mm:ss')}>
          <TimeDisplayHoverCard
            date={new Date(activity.createdAt)}
            className="text-foreground-600 font-mono text-xs leading-none"
          >
            {format(new Date(activity.createdAt), 'MMM d yyyy, HH:mm:ss')}
          </TimeDisplayHoverCard>
        </OverviewItem>

        <OverviewItem label="Status">
          <span
            className={cn('font-mono text-xs uppercase', 'text-' + JOB_STATUS_CONFIG[status]?.color)}
            data-testid="activity-status"
          >
            {status || 'QUEUED'}
          </span>
        </OverviewItem>
      </div>
    </motion.div>
  );
}
