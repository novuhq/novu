import { CopyButton } from '@/components/primitives/copy-button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/primitives/hover-card';
import { cn } from '@/utils/ui';

type TransactionIdDisplayProps = {
  transactionId: string | null;
  className?: string;
};

export function TransactionIdDisplay({ transactionId, className }: TransactionIdDisplayProps) {
  if (!transactionId) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-text-sub font-mono text-xs font-normal tracking-[-0.24px]">N/A</span>
      </div>
    );
  }

  const transactionIds = transactionId
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  if (transactionIds.length <= 1) {
    return (
      <div className="flex items-center gap-1">
        <CopyButton valueToCopy={transactionId} className="text-text-soft size-6 p-1" size="2xs" />
        <span className={cn('text-text-sub font-mono text-xs font-normal tracking-[-0.24px]', className)}>
          {transactionId}
        </span>
      </div>
    );
  }

  const displayIds = transactionIds.slice(0, 2);
  const remainingIds = transactionIds.slice(2);
  const hasMore = remainingIds.length > 0;

  return (
    <div className="flex items-center gap-1">
      <CopyButton valueToCopy={transactionId} className="text-text-soft size-6 p-1" size="2xs" />
      <HoverCard openDelay={200} closeDelay={100}>
        <HoverCardTrigger asChild>
          <span
            className={cn(
              'text-text-sub cursor-help font-mono text-xs font-normal tracking-[-0.24px]',
              hasMore && 'border-text-soft border-b border-dotted',
              className
            )}
          >
            {displayIds.join(', ')}
            {hasMore && ` +${remainingIds.length} more`}
          </span>
        </HoverCardTrigger>
        {hasMore && (
          <HoverCardContent className="w-fit max-w-md" align="end" sideOffset={4}>
            <div className="flex flex-col gap-2">
              <div className="text-muted-foreground text-2xs font-medium uppercase">
                All Transaction IDs ({transactionIds.length})
              </div>
              <div className="max-h-48 overflow-y-auto">
                <div className="grid gap-1">
                  {transactionIds.map((id, index) => (
                    <div
                      key={index}
                      className="bg-muted/40 hover:bg-muted flex items-center justify-between gap-2 rounded-sm p-1 transition-colors"
                    >
                      <span className="break-all font-mono text-xs">{id}</span>
                      <CopyButton valueToCopy={id} className="text-text-soft size-4 shrink-0 p-0.5" size="2xs" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </HoverCardContent>
        )}
      </HoverCard>
    </div>
  );
}
