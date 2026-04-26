import { cn } from '@/utils/ui';

type StatusStyle = { label: string; bgClass: string; textClass?: string };

const STATUS_CONFIG: Record<string, StatusStyle> = {
  resolved: {
    label: 'RESOLVED',
    bgClass: 'bg-success-lighter',
    textClass: 'text-success-base',
  },
  active: {
    label: 'OPEN',
    bgClass: 'bg-[#FEF7E6]',
    textClass: 'text-[#EAB33E]',
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

  return (
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
}
