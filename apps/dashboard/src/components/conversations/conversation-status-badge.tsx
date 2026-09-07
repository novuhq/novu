import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { cn } from '@/utils/ui';

type StatusStyle = { label: string; bgClass: string; textClass?: string; tooltip?: string };

const STATUS_CONFIG: Record<string, StatusStyle> = {
  resolved: {
    label: 'RESOLVED',
    bgClass: 'bg-success-lighter',
    textClass: 'text-success-base',
    tooltip: 'The agent marked this thread complete. A new inbound message will reopen it automatically.',
  },
  active: {
    label: 'ACTIVE',
    bgClass: 'bg-[#FEF7E6]',
    textClass: 'text-[#EAB33E]',
    tooltip:
      'The agent is actively handling this thread. It becomes Resolved when finished, and reopens if a new message arrives.',
  },
  failed: {
    label: 'FAILED',
    bgClass: 'bg-error-lighter',
    textClass: 'text-destructive-base',
  },
  unknown: {
    label: 'UNKNOWN',
    bgClass: 'bg-neutral-100',
    textClass: 'text-text-soft',
  },
};

type ConversationStatusBadgeProps = {
  status: string;
  className?: string;
};

export function ConversationStatusBadge({ status, className }: ConversationStatusBadgeProps) {
  const config: StatusStyle = STATUS_CONFIG[status] ?? STATUS_CONFIG.unknown;

  const badge = (
    <span
      className={cn(
        'font-code inline-flex items-center rounded-md px-1 py-0.5 text-xs font-medium tracking-tight',
        config.bgClass,
        config.textClass ?? '',
        className
      )}
    >
      {config.label}
    </span>
  );

  if (!config.tooltip) {
    return badge;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{badge}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        {config.tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
