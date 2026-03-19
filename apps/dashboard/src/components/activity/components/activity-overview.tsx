import { FeatureFlagsKeysEnum, IActivity } from '@novu/shared';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import React from 'react';
import { Link } from 'react-router-dom';
import { ContextDrawerButton } from '@/components/contexts';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { SubscriberDrawerButton } from '@/components/subscribers/subscriber-drawer';
import { TimeDisplayHoverCard } from '@/components/time-display-hover-card';
import { TopicDrawerButton } from '@/components/topics/topic-drawer';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { fadeIn } from '@/utils/animation';
import { buildRoute, ROUTES } from '@/utils/routes';
import { capitalize } from '@/utils/string';
import { cn } from '@/utils/ui';
import { JOB_STATUS_CONFIG } from '../constants';
import { getActivityStatus } from '../helpers';
import { OverviewItem } from './overview-item';

export interface ActivityOverviewProps {
  activity: IActivity;
}

export function ActivityOverview({ activity }: ActivityOverviewProps) {
  const { currentEnvironment } = useEnvironment();
  const status = getActivityStatus(activity.jobs);

  const workflowPath = buildRoute(ROUTES.EDIT_WORKFLOW, {
    environmentSlug: currentEnvironment?.slug ?? '',
    workflowSlug: activity?.template?._id ?? '',
  });

  const renderTopicsContent = () => {
    if (!activity.topics?.length) {
      return <span className="text-foreground-400 text-[10px] leading-[14px]">-</span>;
    }

    if (activity.topics.length === 1) {
      return (
        <TopicDrawerButton topicKey={activity.topics[0].topicKey} readOnly className="w-full text-start">
          <span className="text-foreground-600 cursor-pointer font-mono text-xs group-hover:underline">
            {activity.topics[0].topicKey}
          </span>
        </TopicDrawerButton>
      );
    }

    const firstTopic = activity.topics[0].topicKey;
    const othersCount = activity.topics.length - 1;

    return (
      <Tooltip>
        <TooltipTrigger>
          <span className="text-foreground-600 cursor-help font-mono text-xs">
            "{firstTopic}" + {othersCount} {othersCount === 1 ? 'other' : 'others'}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm" variant="light">
          <div className="font-mono text-xs">
            {activity.topics.map((topic, index) => (
              <React.Fragment key={topic.topicKey}>
                {index > 0 && ', '}
                <TopicDrawerButton
                  topicKey={topic.topicKey}
                  readOnly
                  className="inline-block bg-transparent p-0 hover:bg-transparent"
                >
                  <span className="cursor-pointer group-hover:underline">"{topic.topicKey}"</span>
                </TopicDrawerButton>
              </React.Fragment>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  };

  const renderContextKeysContent = () => {
    if (!activity.contextKeys?.length) {
      return <span className="text-foreground-400 text-[10px] leading-[14px]">-</span>;
    }

    if (activity.contextKeys.length === 1) {
      return (
        <ContextDrawerButton contextKey={activity.contextKeys[0]} readOnly className="group w-full text-start">
          <span className="text-foreground-600 cursor-pointer font-mono text-xs group-hover:underline">
            {activity.contextKeys[0]}
          </span>
        </ContextDrawerButton>
      );
    }

    const firstContextKey = activity.contextKeys[0];
    const othersCount = activity.contextKeys.length - 1;

    return (
      <Popover>
        <PopoverTrigger asChild>
          <span className="text-foreground-600 cursor-pointer font-mono text-xs hover:underline">
            {firstContextKey} + {othersCount} {othersCount === 1 ? 'other' : 'others'}
          </span>
        </PopoverTrigger>
        <PopoverContent className="max-w-sm" align="start" side="top">
          <div className="font-mono text-xs">
            {activity.contextKeys.map((contextKey, index) => (
              <React.Fragment key={contextKey}>
                {index > 0 && ', '}
                <ContextDrawerButton contextKey={contextKey} readOnly className="group inline-block bg-transparent p-0">
                  <span className="cursor-pointer group-hover:underline">{contextKey}</span>
                </ContextDrawerButton>
              </React.Fragment>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <motion.div {...fadeIn} className="px-3 py-2">
      <div className="mb-2 flex flex-col gap-[12px]">
        <OverviewItem
          label="Workflow Identifier"
          value={activity.template?.triggers?.[0]?.identifier || 'Deleted workflow'}
        >
          <Link
            to={activity.template?._id ? workflowPath : '#'}
            className={cn('text-foreground-600 cursor-pointer font-mono text-xs group-hover:underline', {
              'text-foreground-300 cursor-not-allowed': !activity.template?._id,
            })}
          >
            {activity.template?.triggers?.[0]?.identifier || 'Deleted workflow'}
          </Link>
        </OverviewItem>

        <OverviewItem label="Transaction ID" value={activity.transactionId} isCopyable />

        <OverviewItem
          label="Topics"
          value={activity.topics?.length === 1 ? activity.topics[0].topicKey : undefined}
          isCopyable={activity.topics?.length === 1}
        >
          {renderTopicsContent()}
        </OverviewItem>

        <SubscriberDrawerButton
          disabled={!activity.subscriber}
          className="text-start"
          subscriberId={activity.subscriber?.subscriberId || activity._subscriberId}
        >
          <OverviewItem
            label="Subscriber ID"
            isDeleted={!activity.subscriber}
            value={(activity.subscriber?.subscriberId || activity._subscriberId) ?? ''}
            isCopyable
          >
            <span
              className={cn('text-foreground-600 cursor-pointer font-mono text-xs group-hover:underline', {
                'text-foreground-300 cursor-not-allowed': !activity.subscriber,
              })}
            >
              {(activity.subscriber?.subscriberId || activity._subscriberId) ?? ''}
            </span>
          </OverviewItem>
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
        {typeof activity.severity !== 'undefined' && (
          <OverviewItem label="Severity">
            <span className={cn('font-mono text-xs')} data-testid="activity-severity">
              {capitalize(activity.severity.toString())}
            </span>
          </OverviewItem>
        )}
        {typeof activity.critical === 'boolean' && (
          <OverviewItem label="Critical">
            <span className={cn('font-mono text-xs')} data-testid="activity-severity">
              {activity.critical ? 'true' : 'false'}
            </span>
          </OverviewItem>
        )}
        <OverviewItem
          label="Contexts"
          value={activity.contextKeys?.length === 1 ? activity.contextKeys[0] : undefined}
          isCopyable={activity.contextKeys?.length === 1}
        >
          {renderContextKeysContent()}
        </OverviewItem>
      </div>
    </motion.div>
  );
}
