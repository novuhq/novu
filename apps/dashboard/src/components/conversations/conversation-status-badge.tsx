import { cn } from '@/utils/ui';

const STATUS_CONFIG: Record<string, { label: string; bgClass: string; textClass: string }> = {
  resolved: {
    label: 'RESOLVED',
    bgClass: 'bg-success-lighter',
    textClass: 'text-success-base',
  },
  active: {
    label: 'OPEN',
    bgClass: 'bg-warning-lighter',
    textClass: 'text-warning-base',
  },
  failed: {
    label: 'FAILED',
    bgClass: 'bg-error-lighter',
    textClass: 'text-destructive-base',
  },
};

type ConversationStatusBadgeProps = {
  status: string;
  className?: string;
};

export function ConversationStatusBadge({ status, className }: ConversationStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.active;

  return (
    <span
      className={cn(
        'font-code inline-flex items-center rounded-md px-1 py-0.5 text-xs font-medium tracking-tight',
        config.bgClass,
        config.textClass,
        className
      )}
    >
      {config.label}
    </span>
  );
}
