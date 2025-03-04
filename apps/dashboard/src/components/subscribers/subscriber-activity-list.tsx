import { IActivity, JobStatusEnum, WorkflowOriginEnum } from '@novu/shared';
import { motion } from 'motion/react';
import { FaCode } from 'react-icons/fa6';

import { ActivityEmptyState } from '@/components/activity/activity-empty-state';
import { JOB_STATUS_CONFIG } from '@/components/activity/constants';
import { getActivityStatus } from '@/components/activity/helpers';
import { RouteFill } from '@/components/icons/route-fill';
import { Skeleton } from '@/components/primitives/skeleton';
import { StatusBadge, StatusBadgeIcon } from '@/components/primitives/status-badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { TimeDisplayHoverCard } from '@/components/time-display-hover-card';
import TruncatedText from '@/components/truncated-text';
import { itemVariants, listVariants } from '@/utils/animation';
import { formatDateSimple } from '@/utils/format-date';
import { cn } from '@/utils/ui';

const statusToTooltipStyles: Record<string, string> = {
  completed: 'before:bg-success-lighter before:border before:border-success-lighter text-success-base',
  pending: 'before:bg-warning-lighter before:border before:border-warning-lighter text-warning-base',
  failed: 'before:bg-error-lighter before:border before:border-error-lighter text-error-base',
  disabled: 'before:bg-faded-lighter before:border before:border-faded-light text-faded-base',
};

export const SubscriberActivityList = ({
  isLoading,
  activities,
  hasChangesInFilters,
  onClearFilters,
  onActivitySelect,
}: {
  isLoading: boolean;
  activities: IActivity[];
  hasChangesInFilters: boolean;
  onClearFilters: () => void;
  onActivitySelect: (activityId: string) => void;
}) => {
  if (!isLoading && activities.length === 0) {
    return (
      <motion.div
        key="empty-state"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="flex h-full w-full items-center justify-center"
      >
        <ActivityEmptyState
          emptySearchResults={hasChangesInFilters}
          onClearFilters={onClearFilters}
          emptyFiltersTitle="No activity in the past 30 days"
          emptyFiltersDescription="This subscriber hasn't received any notifications yet. Once a workflow is triggered for them, you'll see their notification history and delivery details here."
        />
      </motion.div>
    );
  }

  if (isLoading) {
    return (
      <motion.div
        key="table-state"
        initial="hidden"
        animate="visible"
        variants={listVariants}
        className="flex flex-1 flex-col overflow-y-auto border-t border-t-neutral-200"
      >
        {Array.from({ length: 10 }).map((_, index) => (
          <motion.div
            key={index}
            variants={itemVariants}
            className="border-b-stroke-soft flex w-full cursor-pointer border-b"
          >
            <div className="flex max-w-96 items-center gap-2 px-3 py-2">
              <Skeleton className="size-3.5 min-w-3.5" />
              <div className="flex w-full flex-col gap-0.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3.5 w-32" />
              </div>
            </div>
            <div className="ml-auto flex items-center px-3 py-2">
              <Skeleton className="size-3.5 min-w-3.5" />
            </div>
            <div className="flex w-40 items-center px-3 py-2">
              <Skeleton className="h-4 w-36" />
            </div>
          </motion.div>
        ))}
      </motion.div>
    );
  }

  return (
    <motion.div
      key="table-state"
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: 0.03,
          },
        },
      }}
      className="flex flex-1 flex-col overflow-y-auto border-t border-t-neutral-200"
    >
      {activities.map((activity) => {
        const status = getActivityStatus(activity.jobs);
        const { variant, icon: Icon, label } = JOB_STATUS_CONFIG[status] || JOB_STATUS_CONFIG[JobStatusEnum.PENDING];

        return (
          <motion.div
            key={activity._id}
            variants={itemVariants}
            className="border-b-stroke-soft flex w-full cursor-pointer border-b last:border-b-0"
            onClick={() => {
              onActivitySelect(activity._id);
            }}
          >
            <div className={cn('flex max-w-96 items-center gap-2 px-3 py-2', { 'opacity-50': !activity.template })}>
              {activity.template?.origin === WorkflowOriginEnum.EXTERNAL ? (
                <FaCode className="size-3.5 min-w-3.5" />
              ) : (
                <RouteFill className={cn('text-feature size-3.5 min-w-3.5')} />
              )}
              <div className="flex w-full flex-col gap-0.5">
                <TruncatedText className={cn('text-label-xs', { 'text-foreground-400': !activity.template })}>
                  {activity.template?.name ?? 'Deleted workflow'}
                </TruncatedText>
                <TruncatedText className="text-paragraph-2xs text-text-soft">
                  {activity.template?.triggers.map((trigger) => trigger.identifier).join(', ')}
                </TruncatedText>
              </div>
            </div>
            <div className={cn('ml-auto flex items-center px-3 py-2', { 'opacity-50': !activity.template })}>
              <Tooltip>
                <TooltipTrigger>
                  <StatusBadge variant="light" status={variant}>
                    <StatusBadgeIcon as={Icon} />
                  </StatusBadge>
                </TooltipTrigger>
                <TooltipContent className="bg-background relative">
                  <div
                    className={cn(
                      statusToTooltipStyles[variant ?? 'disabled'],
                      'before:absolute before:inset-0 before:rounded-md before:content-[""]'
                    )}
                  >
                    <span className="relative">{label}</span>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className={cn('flex w-40 items-center px-3 py-2', { 'opacity-50': !activity.template })}>
              <TimeDisplayHoverCard
                date={new Date(activity.createdAt)}
                className="text-label-xs text-text-soft flex w-full justify-end"
              >
                {formatDateSimple(activity.createdAt, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </TimeDisplayHoverCard>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
};
