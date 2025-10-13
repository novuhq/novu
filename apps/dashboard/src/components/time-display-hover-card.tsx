import { formatDistanceToNow } from 'date-fns';
import { HoverCard, HoverCardContent, HoverCardPortal, HoverCardTrigger } from '@/components/primitives/hover-card';
import { cn } from '@/utils/ui';

interface TimeDisplayHoverCardProps {
  date: Date | string | undefined;
  children?: React.ReactNode;
  className?: string;
}

const DATE_TIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = Object.freeze({
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

const LOCAL_TIME_FORMATTER = new Intl.DateTimeFormat('default', DATE_TIME_FORMAT_OPTIONS);
const UTC_TIME_FORMATTER = new Intl.DateTimeFormat('default', {
  ...DATE_TIME_FORMAT_OPTIONS,
  timeZone: 'UTC',
});

export function TimeDisplayHoverCard({ date, children, className }: TimeDisplayHoverCardProps) {
  if (!date) {
    return <span className={className}>{children}</span>;
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const utcTime = UTC_TIME_FORMATTER.format(dateObj);
  const localTime = LOCAL_TIME_FORMATTER.format(dateObj);
  const timeAgo = formatDistanceToNow(dateObj, { addSuffix: true });

  return (
    <HoverCard openDelay={100} closeDelay={100}>
      <HoverCardTrigger asChild className="hover:cursor-default">
        <span className={cn('relative z-10', className)}>{children}</span>
      </HoverCardTrigger>
      <HoverCardPortal>
        <HoverCardContent className="w-fit" align="end" sideOffset={4}>
          <div className="flex flex-col gap-2">
            <div className="text-muted-foreground text-2xs font-medium uppercase">Time Details</div>
            <div className="flex flex-col gap-2 text-xs capitalize">
              <div className="bg-muted/40 hover:bg-muted flex items-center justify-between gap-4 rounded-sm transition-colors">
                <span className="text-muted-foreground">UTC</span>
                <span className="font-medium">{utcTime}</span>
              </div>
              <div className="bg-muted/40 hover:bg-muted flex items-center justify-between gap-4 rounded-sm transition-colors">
                <span className="text-muted-foreground">Local</span>
                <span className="font-medium">{localTime}</span>
              </div>
              <div className="bg-muted/40 hover:bg-muted flex items-center justify-between gap-4 rounded-sm transition-colors">
                <span className="text-muted-foreground">Relative</span>
                <span className="font-medium normal-case">{timeAgo}</span>
              </div>
            </div>
          </div>
        </HoverCardContent>
      </HoverCardPortal>
    </HoverCard>
  );
}
