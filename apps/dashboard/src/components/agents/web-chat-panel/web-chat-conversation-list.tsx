import { RiArrowLeftLine } from 'react-icons/ri';
import { cn } from '@/utils/ui';
import type { WebChatSessionItem } from './use-web-chat-conversation-list';

const PAST_CHAT_LIMIT = 5;

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

export function WebChatConversationList({
  conversations,
  failed,
  onSelect,
}: {
  conversations: WebChatSessionItem[];
  failed?: boolean;
  onSelect: (identifier: string) => void;
}) {
  const visible = conversations.slice(0, PAST_CHAT_LIMIT);

  if (visible.length === 0 && !failed) {
    return null;
  }

  return (
    <nav aria-label="Conversations" className="flex flex-col gap-2 overflow-hidden px-1 pt-2">
      <p className="text-label-xs text-text-soft px-2 font-medium">Conversations</p>
      {failed && visible.length === 0 ? (
        <p className="text-paragraph-xs text-text-soft px-2">Could not load conversations</p>
      ) : null}
      {visible.length > 0 ? (
        <ul className="flex flex-col">
          {visible.map((conversation) => (
            <li key={conversation.identifier}>
              <button
                type="button"
                onClick={() => onSelect(conversation.identifier)}
                className={cn(
                  'flex w-full items-baseline gap-3 rounded-lg px-2 py-2 text-left',
                  'hover:bg-bg-weak focus-visible:bg-bg-weak focus-visible:outline-none'
                )}
              >
                <span className="text-label-xs text-text-strong min-w-0 flex-1 truncate font-medium">
                  {conversation.title}
                </span>
                <time
                  dateTime={conversation.lastActivityAt}
                  className="text-paragraph-xs text-text-soft shrink-0 tabular-nums"
                >
                  {relativeTime(conversation.lastActivityAt)}
                </time>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </nav>
  );
}

export function WebChatBackToChatsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-label-xs text-text-sub hover:text-text-strong hover:bg-bg-weak inline-flex items-center gap-1 rounded-md px-1.5 py-1 font-medium"
    >
      <RiArrowLeftLine className="size-3.5" aria-hidden />
      Conversations
    </button>
  );
}
