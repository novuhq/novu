import { RiArrowRightLine, RiCheckboxCircleFill, RiRobot2Line } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import type { AgentResponse } from '@/api/agents';
import type { ConversationDto } from '@/api/conversations';
import { ConversationStatusBadge } from '@/components/conversations/conversation-status-badge';
import { ConversationsUpgradeCta } from '@/components/conversations/conversations-upgrade-cta';
import { SubscriberFallbackAvatar } from '@/components/conversations/subscriber-fallback-avatar';
import { Skeleton } from '@/components/primitives/skeleton';
import { IS_SELF_HOSTED } from '@/config';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchConversations } from '@/hooks/use-fetch-conversations';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';

const RECENT_CONVERSATIONS_DISPLAY_LIMIT = 5;

type RecentConversationsSectionProps = {
  agent: AgentResponse;
};

export function RecentConversationsSection({ agent }: RecentConversationsSectionProps) {
  const { currentEnvironment } = useEnvironment();

  const conversationsPath = currentEnvironment?.slug
    ? buildRoute(ROUTES.ACTIVITY_CONVERSATIONS, { environmentSlug: currentEnvironment.slug })
    : undefined;

  return (
    <div className="bg-bg-weak flex flex-col rounded-[10px] p-1">
      <div className="flex items-center justify-between px-2 py-1.5">
        <span className="text-text-soft font-code text-[11px] font-medium uppercase leading-4 tracking-wider">
          Recent conversations
        </span>
        {!IS_SELF_HOSTED && conversationsPath ? (
          <Link
            to={conversationsPath}
            className="text-text-sub hover:text-text-strong text-label-xs flex items-center gap-0.5 rounded-lg p-1.5 font-medium transition-colors"
          >
            View all
            <RiArrowRightLine className="size-4" />
          </Link>
        ) : null}
      </div>

      <div className="bg-bg-white flex h-[300px] flex-col overflow-hidden rounded-md shadow-[0px_0px_0px_1px_rgba(25,28,33,0.04),0px_1px_2px_0px_rgba(25,28,33,0.06),0px_0px_2px_0px_rgba(0,0,0,0.08)]">
        {!IS_SELF_HOSTED ? (
          <RecentConversationsContent agent={agent} />
        ) : (
          <ConversationsUpgradeCta source="agent-overview" variant="compact" />
        )}
      </div>
    </div>
  );
}

function RecentConversationsContent({ agent }: { agent: AgentResponse }) {
  const { currentEnvironment } = useEnvironment();

  const { conversations, isLoading, isError } = useFetchConversations({
    limit: RECENT_CONVERSATIONS_DISPLAY_LIMIT,
    filters: { agentId: agent.identifier },
  });

  if (isLoading) {
    return <RecentConversationsSkeleton />;
  }

  if (isError) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 text-center">
        <p className="text-text-soft text-label-xs max-w-[320px] font-medium leading-4">
          We couldn't load recent conversations. Please try again in a moment.
        </p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 text-center">
        <p className="text-text-soft text-label-xs max-w-[320px] font-medium leading-4">
          No conversations yet. Once this agent starts replying to messages, they'll show up here.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-1 flex-col divide-y divide-stroke-soft overflow-auto">
      {conversations.map((conversation) => (
        <li key={conversation._id}>
          <RecentConversationItem conversation={conversation} environmentSlug={currentEnvironment?.slug} />
        </li>
      ))}
    </ul>
  );
}

type RecentConversationItemProps = {
  conversation: ConversationDto;
  environmentSlug: string | undefined;
};

function RecentConversationItem({ conversation, environmentSlug }: RecentConversationItemProps) {
  const subscriber = getSubscriberLabel(conversation);
  const subscriberParticipant = (conversation.participants ?? []).find((p) => p.type === 'subscriber');
  const subscriberAvatar = subscriberParticipant?.subscriber?.avatar;
  const isFailed = conversation.status === 'failed';

  const baseClassName = 'flex flex-col gap-1.5 px-3 py-2';
  const interactiveClassName =
    'group transition-colors hover:bg-neutral-50 focus-visible:bg-neutral-50 focus-visible:outline-none';

  const content = (
    <>
      <div className="flex items-center gap-8">
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <RiCheckboxCircleFill
            className={cn('size-4 shrink-0', isFailed ? 'text-destructive-base' : 'text-success-base')}
          />
          <span className="text-text-sub text-label-xs min-w-0 truncate font-medium">
            {conversation.title || 'Untitled conversation'}
          </span>
        </div>
        <span className="text-text-soft font-code shrink-0 text-[11px] leading-normal">
          {formatTimestamp(conversation.lastActivityAt || conversation.createdAt)}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">
          <RiRobot2Line className="text-text-soft size-4 shrink-0" />
          <span className="text-text-soft font-code truncate text-xs font-medium tracking-tight">
            {getAgentName(conversation)}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {subscriber && (
            <>
              <div className="border-stroke-soft flex max-w-[150px] items-center gap-1 rounded border bg-[#fbfbfb] px-1 py-0.5">
                {subscriberAvatar ? (
                  <img src={subscriberAvatar} alt="" className="size-4 shrink-0 rounded-full object-cover" />
                ) : (
                  <SubscriberFallbackAvatar className="size-4" />
                )}
                <span className="text-text-strong font-code min-w-0 truncate text-xs font-medium">{subscriber}</span>
              </div>
              <span className="text-text-soft font-code text-[11px] leading-normal">•</span>
            </>
          )}
          <ConversationStatusBadge status={conversation.status} />
        </div>
      </div>
    </>
  );

  if (!environmentSlug) {
    return <div className={baseClassName}>{content}</div>;
  }

  const detailPath = `${buildRoute(ROUTES.ACTIVITY_CONVERSATIONS, { environmentSlug })}?conversationItemId=${encodeURIComponent(conversation.identifier)}`;

  return (
    <Link to={detailPath} className={cn(baseClassName, interactiveClassName)}>
      {content}
    </Link>
  );
}

function RecentConversationsSkeleton() {
  return (
    <ul className="flex flex-1 flex-col divide-y divide-stroke-soft">
      {Array.from({ length: RECENT_CONVERSATIONS_DISPLAY_LIMIT }, (_, index) => (
        <li key={`skeleton-${index}`} className="flex flex-col gap-1.5 px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Skeleton className="size-4 rounded-full" />
              <Skeleton className="h-3.5 w-40" />
            </div>
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-20" />
            <div className="flex items-center gap-1">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-4 w-12 rounded-md" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function getSubscriberLabel(conversation: ConversationDto): string | undefined {
  const participant = (conversation.participants ?? []).find((p) => p.type === 'subscriber');
  if (!participant) return undefined;

  const sub = participant.subscriber;
  if (sub?.firstName || sub?.lastName) {
    return [sub.firstName, sub.lastName].filter(Boolean).join(' ');
  }

  return sub?.subscriberId ?? participant.id;
}

function getAgentName(conversation: ConversationDto): string {
  const agent = (conversation.participants ?? []).find((p) => p.type === 'agent');

  return agent?.agent?.name ?? agent?.id ?? conversation._agentId ?? 'agent';
}

function formatTimestamp(dateStr: string | undefined): string {
  if (!dateStr?.trim()) {
    return '—';
  }

  const d = new Date(dateStr);

  if (Number.isNaN(d.getTime())) {
    return '—';
  }

  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const day = d.getDate();
  const time = d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

  return `${month} ${day} ${time}`;
}
