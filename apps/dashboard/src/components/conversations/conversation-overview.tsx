import { RiArrowRightUpLine, RiRobot2Line } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { ConversationDto } from '@/api/conversations';
import { TimeDisplayHoverCard } from '@/components/time-display-hover-card';
import { useEnvironment } from '@/context/environment/hooks';
import { getProviderSquareIconFileName } from '@/utils/provider-square-icon';
import { buildRoute, ROUTES } from '@/utils/routes';
import { ConversationStatusBadge } from './conversation-status-badge';
import { SubscriberFallbackAvatar } from './subscriber-fallback-avatar';

type ConversationOverviewProps = {
  conversation: ConversationDto;
};

function MetaRow({ label, children, isLast }: { label: string; children: React.ReactNode; isLast?: boolean }) {
  return (
    <div className={`flex flex-col items-start py-1 ${isLast ? '' : 'border-stroke-soft border-b'}`}>
      <div className="flex h-6 w-full items-center justify-between overflow-hidden px-1.5">
        <span className="text-text-soft font-code text-xs font-medium tracking-tight">{label}</span>
        <div className="text-text-sub font-code text-xs tracking-tight">{children}</div>
      </div>
    </div>
  );
}

export function ConversationOverview({ conversation }: ConversationOverviewProps) {
  const { currentEnvironment } = useEnvironment();
  const participants = conversation.participants ?? [];
  const channels = conversation.channels ?? [];
  const subscriber = participants.find((p) => p.type === 'subscriber');
  const agent = participants.find((p) => p.type === 'agent');
  const agentName = agent?.agent?.name ?? agent?.id ?? conversation._agentId ?? 'agent';
  const agentIdentifier = agent?.agent?.identifier ?? agent?.id;
  const agentLink =
    agentIdentifier && currentEnvironment?.slug
      ? buildRoute(ROUTES.AGENT_DETAILS, { environmentSlug: currentEnvironment.slug, agentIdentifier })
      : undefined;
  const platforms = [...new Set(channels.map((c) => c.platform))];

  const sourceRequestId = (conversation.metadata?.sourceRequestId as string) ?? undefined;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col">
        <div className="border-stroke-soft rounded-lg border bg-white p-1">
          {sourceRequestId && (
            <MetaRow label="API request (source)">
              <span className="font-normal">{sourceRequestId} ↗</span>
            </MetaRow>
          )}
          <MetaRow label="Conversation ID">
            <span className="font-normal">{conversation.identifier}</span>
          </MetaRow>
          <MetaRow label="Thread started">
            <TimeDisplayHoverCard date={conversation.createdAt} className="font-normal">
              {conversation.createdAt ? new Date(conversation.createdAt).toLocaleString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
              }) : '—'}
            </TimeDisplayHoverCard>
          </MetaRow>
          <MetaRow label="Agent">
            {agentLink ? (
              <Link
                to={agentLink}
                className="flex items-center gap-1 font-medium underline decoration-dashed underline-offset-[3px] decoration-[currentColor]/40 transition-colors hover:text-text-strong hover:decoration-[currentColor]/70"
              >
                <RiRobot2Line className="size-3.5" />
                {agentName}
                <RiArrowRightUpLine className="size-3" />
              </Link>
            ) : (
              <span className="flex items-center gap-1 font-medium">
                <RiRobot2Line className="size-3.5" />
                {agentName}
              </span>
            )}
          </MetaRow>
          <MetaRow label="Providers">
            <div className="flex items-center gap-1">
              {platforms.map((platform) => (
                <div key={platform} className="border-stroke-soft rounded border bg-[#fbfbfb] p-0.5">
                  <img
                    src={`/images/providers/light/square/${getProviderSquareIconFileName(platform)}.svg`}
                    alt={platform}
                    className="size-[15px] object-contain"
                  />
                </div>
              ))}
              {platforms.length === 0 && <span className="text-text-soft text-xs">—</span>}
            </div>
          </MetaRow>
          <MetaRow label="Status" isLast>
            <ConversationStatusBadge status={conversation.status} />
          </MetaRow>
        </div>

        <div className="px-[18px]">
          <div className="border-stroke-soft h-2 border-l" />
        </div>

        {subscriber &&
          (() => {
            const sub = subscriber.subscriber;
            const displayName = [sub?.firstName, sub?.lastName].filter(Boolean).join(' ') || subscriber.id;
            const subscriberId = sub?.subscriberId ?? subscriber.id;

            return (
              <div className="border-stroke-soft rounded-lg border bg-white p-1">
                <div className="bg-bg-weak flex items-center gap-2 overflow-hidden rounded p-1">
                  {sub?.avatar ? (
                    <img src={sub.avatar} alt="" className="size-8 shrink-0 rounded-full object-cover" />
                  ) : (
                    <SubscriberFallbackAvatar className="size-8" />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-text-strong text-label-xs truncate font-medium">{displayName}</span>
                    <span className="text-text-soft font-code text-label-xs truncate font-medium" title={subscriberId}>
                      {subscriberId}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
      </div>
    </div>
  );
}
