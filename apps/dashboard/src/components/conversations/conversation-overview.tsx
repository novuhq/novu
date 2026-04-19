import { RiRobot2Line } from 'react-icons/ri';
import { ConversationDto } from '@/api/conversations';
import { getProviderSquareIconFileName } from '@/utils/provider-square-icon';
import { ConversationStatusBadge } from './conversation-status-badge';
import { SubscriberFallbackAvatar } from './subscriber-fallback-avatar';

type ConversationOverviewProps = {
  conversation: ConversationDto;
};

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
  const year = d.getFullYear();
  const time = d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return `${month} ${day} ${year} ${time}`;
}

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
  const participants = conversation.participants ?? [];
  const channels = conversation.channels ?? [];
  const subscriber = participants.find((p) => p.type === 'subscriber');
  const agent = participants.find((p) => p.type === 'agent');
  const agentName = agent?.agent?.name ?? agent?.id ?? conversation._agentId ?? 'agent';
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
            <span className="font-normal">{formatTimestamp(conversation.createdAt)}</span>
          </MetaRow>
          <MetaRow label="Agent">
            <span className="flex items-center gap-1 font-medium">
              <RiRobot2Line className="size-3.5" />
              {agentName} ↗
            </span>
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
