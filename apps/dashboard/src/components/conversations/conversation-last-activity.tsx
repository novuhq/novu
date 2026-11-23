import type { ConversationDto } from '@/api/conversations';
import { TimeDisplayHoverCard } from '@/components/time-display-hover-card';
import { formatDateSimple } from '@/utils/format-date';

const OLDER_ACTIVITY_FORMAT: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
};

type ConversationLastActivityProps = {
  conversation: Pick<ConversationDto, 'lastActivityAt' | 'createdAt'>;
  className?: string;
};

export function ConversationLastActivity({ conversation, className }: ConversationLastActivityProps) {
  const timestamp = conversation.lastActivityAt || conversation.createdAt;

  if (!timestamp?.trim() || Number.isNaN(new Date(timestamp).getTime())) {
    return <span className={className}>-</span>;
  }

  return (
    <TimeDisplayHoverCard date={timestamp} className={className}>
      <time dateTime={timestamp}>{formatDateSimple(timestamp, OLDER_ACTIVITY_FORMAT)}</time>
    </TimeDisplayHoverCard>
  );
}
