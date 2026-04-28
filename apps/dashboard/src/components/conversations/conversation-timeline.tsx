import { Fragment, useId, useState } from 'react';
import {
  RiCheckboxCircleFill,
  RiExpandUpDownLine,
  RiReplyLine,
  RiRobot2Line,
  RiRouteFill,
  RiShareForwardLine,
} from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { ConversationActivityDto } from '@/api/conversations';
import { Skeleton } from '@/components/primitives/skeleton';
import { useEnvironment } from '@/context/environment/hooks';
import { getProviderSquareIconFileName } from '@/utils/provider-square-icon';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { ConversationStatusBadge } from './conversation-status-badge';
import { SubscriberFallbackAvatar } from './subscriber-fallback-avatar';

type ConversationTimelineProps = {
  activities: ConversationActivityDto[];
  isLoading: boolean;
  totalCount: number;
  conversationStatus?: string;
};

function formatActivityTimestamp(dateStr: string | undefined): string {
  if (!dateStr?.trim()) {
    return '—';
  }

  const d = new Date(dateStr);

  if (Number.isNaN(d.getTime())) {
    return '—';
  }

  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const year = String(d.getFullYear()).slice(2);
  const time = d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

  return `${day} ${month} ${year}, ${time}`;
}

function TimelineDivider() {
  return (
    <div className="px-[18px]">
      <div className="border-stroke-soft h-2 border-l" />
    </div>
  );
}

function SenderHeader({ activity }: { activity: ConversationActivityDto }) {
  const isAgent = activity.senderType === 'agent';
  const name = activity.senderName ?? activity.senderId;

  return (
    <div className="flex items-center gap-1">
      <div className="bg-bg-weak flex h-5 items-center rounded p-0.5">
        <RiCheckboxCircleFill className="text-success-base size-4" />
      </div>
      <div
        className={cn(
          'flex max-w-[150px] items-center gap-1 rounded border px-1 py-0.5',
          isAgent ? 'border-stroke-soft bg-white' : 'border-stroke-soft bg-bg-weak'
        )}
      >
        {isAgent ? (
          <RiRobot2Line className="text-text-sub size-4 shrink-0" />
        ) : (
          <SubscriberFallbackAvatar className="size-4" />
        )}
        <span className="text-text-sub text-label-xs min-w-0 truncate font-medium">{name}</span>
      </div>
      {isAgent && (
        <div className="border-stroke-soft flex items-center rounded border bg-white px-1 py-0.5">
          <RiRobot2Line className="text-text-soft size-4" />
        </div>
      )}
    </div>
  );
}

function MessageTimestamp({ activity }: { activity: ConversationActivityDto }) {
  const isAgent = activity.senderType === 'agent';

  return (
    <div className="flex shrink-0 items-center gap-2">
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-0.5">
          {isAgent ? (
            <RiReplyLine className="text-text-soft size-3" />
          ) : (
            <RiShareForwardLine className="text-text-soft size-3" />
          )}
          <span className="text-text-soft text-[10px] font-medium leading-[14px]">
            {formatActivityTimestamp(activity.createdAt)}
            {activity.platform ? ' via' : ''}
          </span>
        </div>
        {activity.platform && (
          <div className="border-stroke-soft bg-bg-weak flex items-center gap-[3px] rounded border px-1 py-0.5">
            <img
              src={`/images/providers/light/square/${getProviderSquareIconFileName(activity.platform)}.svg`}
              alt={activity.platform}
              className="size-3.5 object-contain"
            />
            <span className="text-text-sub text-[10px] font-medium leading-[14px] capitalize">{activity.platform}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();
  const isLong = content.length > 80;
  const displayContent = expanded ? content : content.slice(0, 80);

  return (
    <div className="flex items-center gap-2.5 px-2 py-1">
      <p
        id={contentId}
        className={cn(
          'text-label-xs min-w-0 flex-1 font-medium text-[#1a1a1a]',
          !expanded && 'truncate',
          expanded && 'wrap-break-word whitespace-pre-wrap'
        )}
      >
        {displayContent}
        {isLong && !expanded && '...'}
      </p>
      {isLong && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={() => setExpanded(!expanded)}
          className="text-text-soft hover:text-text-sub flex shrink-0 cursor-pointer items-center gap-0.5 transition-colors"
        >
          <RiExpandUpDownLine className="size-3.5" />
          <span className="text-[10px] font-medium leading-[14px]">{expanded ? 'Collapse' : 'Show full message'}</span>
        </button>
      )}
    </div>
  );
}

function MessageCard({ activity }: { activity: ConversationActivityDto }) {
  const isAgent = activity.senderType === 'agent';

  return (
    <div className={cn('border-stroke-soft flex flex-col rounded-md border', isAgent ? 'bg-bg-weak' : 'bg-white')}>
      <div className="flex flex-col py-1">
        <div className="flex items-center justify-between px-2 py-1">
          <SenderHeader activity={activity} />
          <MessageTimestamp activity={activity} />
        </div>
        {activity.content && <MessageContent content={activity.content} />}
      </div>
    </div>
  );
}

function InlineLogRow({ activity }: { activity: ConversationActivityDto }) {
  const isAgentAction = activity.senderType === 'agent' || activity.senderType === 'system';
  const signalData = activity.signalData;
  const signalType = signalData?.type;
  const { currentEnvironment } = useEnvironment();

  const transactionId =
    signalType === 'trigger' && signalData?.type === 'trigger' ? signalData.payload?.transactionId : undefined;

  const activityFeedLink =
    transactionId && currentEnvironment?.slug
      ? `${buildRoute(ROUTES.ACTIVITY_WORKFLOW_RUNS, { environmentSlug: currentEnvironment.slug })}?transactionId=${transactionId}`
      : undefined;

  const icon =
    signalType === 'trigger' ? (
      <RiRouteFill className="text-text-soft size-3.5 shrink-0" />
    ) : (
      <RiRobot2Line className={cn('size-3.5 shrink-0', isAgentAction ? 'text-text-soft' : 'text-text-soft')} />
    );

  return (
    <div className="flex items-center gap-1 overflow-hidden py-0.5 pl-[11px]">
      {icon}
      {activityFeedLink ? (
        <Link
          to={activityFeedLink}
          className="text-text-sub text-label-xs min-w-0 truncate font-medium underline decoration-dashed underline-offset-[3px] decoration-[currentColor]/40 transition-colors hover:text-text-strong hover:decoration-[currentColor]/70"
        >
          {activity.content}
        </Link>
      ) : (
        <span className="text-text-sub text-label-xs min-w-0 truncate font-medium">{activity.content}</span>
      )}
      <span className="text-text-soft font-code shrink-0 text-[11px] leading-normal">•</span>
      <span className="text-text-soft shrink-0 text-[10px] font-medium leading-[14px]">
        {formatActivityTimestamp(activity.createdAt)}
      </span>
    </div>
  );
}

function ResolvedFooter({ totalCount }: { totalCount: number }) {
  return (
    <div className="relative flex items-center overflow-hidden py-2 pl-9">
      <div className="border-stroke-soft absolute left-[18px] top-0 h-[calc(50%+1px)] w-3.5 rounded-bl-md border-b border-l" />
      <div className="flex items-center gap-1.5 px-1">
        <div className="flex items-center gap-1">
          <ConversationStatusBadge status="resolved" />
          <span className="text-text-soft font-code text-[11px] leading-normal">•</span>
          <div className="border-stroke-soft bg-bg-weak flex items-center gap-0.5 rounded border px-1 py-0.5">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-text-sub shrink-0">
              <path
                d="M1.5 2.5h9v6h-3.3L5.4 10v-1.5H1.5v-6Z"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-text-sub text-label-xs font-medium">{totalCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ConversationTimeline({ activities, isLoading, totalCount, conversationStatus }: ConversationTimelineProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 p-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 py-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-3.5 w-32" />
            </div>
            <Skeleton className="ml-2 h-4 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <p className="text-text-soft text-paragraph-sm">No activities yet</p>
      </div>
    );
  }

  const isResolved = conversationStatus === 'resolved';

  return (
    <div className="flex flex-col gap-3 p-3">
      <div>
        <h3 className="text-text-sub text-label-sm font-medium">Conversation timeline</h3>
        <p className="text-text-soft text-label-xs mt-0.5 font-medium">
          Everything that happened in this conversation, in order
        </p>
      </div>

      <div className="flex flex-col">
        {activities.map((activity, index) => (
          <Fragment key={activity._id}>
            {index > 0 && <TimelineDivider />}
            {activity.type === 'message' ? <MessageCard activity={activity} /> : <InlineLogRow activity={activity} />}
          </Fragment>
        ))}

        {isResolved && (
          <>
            <TimelineDivider />
            <ResolvedFooter totalCount={totalCount} />
          </>
        )}
      </div>
    </div>
  );
}
