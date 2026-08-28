import { RiAddLine, RiArrowDownSLine, RiCheckLine } from 'react-icons/ri';
import { CompactButton } from '@/components/primitives/button-compact';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { cn } from '@/utils/ui';
import type { WebChatSessionItem } from './use-web-chat-conversation-list';

function relativeTime(iso: string): string {
  const deltaMs = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(deltaMs)) {
    return '';
  }

  const minutes = Math.round(deltaMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return `${Math.round(hours / 24)}d ago`;
}

export function WebChatSessionBar({
  conversations,
  activeConversationId,
  onSelect,
  onNewChat,
  canStartNew,
}: {
  conversations: WebChatSessionItem[];
  activeConversationId?: string;
  onSelect: (identifier: string) => void;
  onNewChat: () => void;
  canStartNew: boolean;
}) {
  const active = conversations.find((conversation) => conversation.identifier === activeConversationId);
  const label = active?.title ?? (activeConversationId ? 'Current chat' : 'New chat');
  const hasHistory = conversations.length > 0;

  if (!hasHistory && !activeConversationId) {
    return null;
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="hover:bg-bg-weak flex min-w-0 flex-1 items-center gap-1 rounded-md px-2 py-1.5 text-left"
            aria-label="Switch conversation"
          >
            <span className="text-label-xs text-text-strong min-w-0 flex-1 truncate font-medium">{label}</span>
            <RiArrowDownSLine className="text-text-soft size-3.5 shrink-0" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[min(20rem,calc(100vw-2rem))]" sideOffset={4}>
          {hasHistory ? (
            conversations.map((conversation) => {
              const isActive = conversation.identifier === activeConversationId;

              return (
                <DropdownMenuItem
                  key={conversation.identifier}
                  className="items-start"
                  onSelect={() => onSelect(conversation.identifier)}
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-label-xs text-text-strong truncate">{conversation.title}</span>
                    <span className="text-paragraph-xs text-text-soft">
                      {relativeTime(conversation.lastActivityAt)}
                    </span>
                  </span>
                  <RiCheckLine className={cn('text-text-sub mt-0.5 size-3.5 shrink-0', !isActive && 'invisible')} />
                </DropdownMenuItem>
              );
            })
          ) : (
            <p className="text-paragraph-xs text-text-soft px-2 py-1.5">No earlier chats</p>
          )}
          {canStartNew ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onNewChat}>
                <RiAddLine className="size-3.5" aria-hidden />
                <span className="text-label-xs">New chat</span>
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <CompactButton
        type="button"
        size="md"
        variant="ghost"
        icon={RiAddLine}
        disabled={!canStartNew}
        aria-label="New chat"
        onClick={onNewChat}
      />
    </div>
  );
}
