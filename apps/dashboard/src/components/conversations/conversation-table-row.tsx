import type { KeyboardEvent } from 'react';
import { RiCheckboxCircleFill, RiRobot2Line } from 'react-icons/ri';
import { ConversationDto } from '@/api/conversations';
import { TableCell, TableRow } from '@/components/primitives/table';
import { cn } from '@/utils/ui';
import { ConversationLastActivity } from './conversation-last-activity';
import { ConversationStatusBadge } from './conversation-status-badge';
import { toPlainTextPreview } from './conversation-text-preview';
import { SubscriberFallbackAvatar } from './subscriber-fallback-avatar';

type ConversationTableRowProps = {
  conversation: ConversationDto;
  isSelected?: boolean;
  onClick?: (conversationId: string) => void;
};

function getSubscriberLabel(conversation: ConversationDto): string | undefined {
  const p = (conversation.participants ?? []).find((p) => p.type === 'subscriber');
  if (!p) return undefined;

  const sub = p.subscriber;
  if (sub?.firstName || sub?.lastName) {
    return [sub.firstName, sub.lastName].filter(Boolean).join(' ');
  }

  return sub?.subscriberId ?? p.id;
}

function getAgentName(conversation: ConversationDto): string {
  const agent = (conversation.participants ?? []).find((p) => p.type === 'agent');

  return agent?.agent?.name ?? agent?.id ?? conversation._agentId ?? 'agent';
}

export function ConversationTableRow({ conversation, isSelected, onClick }: ConversationTableRowProps) {
  const handleClick = () => {
    onClick?.(conversation.identifier);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      if (event.key === ' ') {
        event.preventDefault();
      }

      handleClick();
    }
  };

  const subscriber = getSubscriberLabel(conversation);
  const subscriberParticipant = (conversation.participants ?? []).find((p) => p.type === 'subscriber');
  const subscriberAvatar = subscriberParticipant?.subscriber?.avatar;
  const agentName = getAgentName(conversation);
  const title = toPlainTextPreview(conversation.title) || 'Untitled conversation';
  const isFailed = conversation.status === 'failed';

  return (
    <TableRow
      tabIndex={0}
      aria-selected={isSelected}
      className={cn('relative cursor-pointer hover:bg-neutral-50', isSelected && 'bg-neutral-50')}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <TableCell colSpan={2} className="px-3 py-1.5">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-8">
            <div className="flex min-w-0 flex-1 items-center gap-1">
              <RiCheckboxCircleFill
                className={cn('size-4 shrink-0', isFailed ? 'text-destructive-base' : 'text-success-base')}
              />
              <span
                dir="auto"
                title={title}
                className="text-text-sub text-label-xs min-w-0 truncate text-left font-medium"
              >
                {title}
              </span>
            </div>
            <ConversationLastActivity
              conversation={conversation}
              className="text-text-soft font-code shrink-0 text-[11px] leading-normal"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <RiRobot2Line className="text-text-soft size-4 shrink-0" />
              <span className="text-text-soft font-code text-xs font-medium tracking-tight">{agentName}</span>
            </div>
            <div className="flex items-center gap-1">
              {subscriber && (
                <>
                  <div className="flex max-w-[150px] items-center gap-1 rounded border border-stroke-soft bg-[#fbfbfb] px-1 py-0.5">
                    {subscriberAvatar ? (
                      <img src={subscriberAvatar} alt="" className="size-4 shrink-0 rounded-full object-cover" />
                    ) : (
                      <SubscriberFallbackAvatar className="size-4" />
                    )}
                    <span className="text-text-strong font-code min-w-0 truncate text-xs font-medium">
                      {subscriber}
                    </span>
                  </div>
                  <span className="text-text-soft font-code text-[11px] leading-normal">•</span>
                </>
              )}
              <ConversationStatusBadge status={conversation.status} />
            </div>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}
