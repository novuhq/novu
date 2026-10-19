import { cn } from '@/utils/ui';

type MethodBadgeProps = {
  method: string;
  className?: string;
};

export function MethodBadge({ method, className }: MethodBadgeProps) {
  return (
    <span className={cn('text-label-xs text-text-soft font-code inline-flex items-center font-medium', className)}>
      {method}
    </span>
  );
}
