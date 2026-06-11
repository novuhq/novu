import { Badge } from '@/components/primitives/badge';
import { cn } from '@/utils/ui';

type BetaBadgeProps = {
  variant?: 'nav' | 'header';
  className?: string;
};

export function BetaBadge({ variant = 'header', className }: BetaBadgeProps) {
  if (variant === 'nav') {
    return (
      <Badge variant="lighter" className={cn('text-xs', className)}>
        BETA
      </Badge>
    );
  }

  return (
    <Badge color="gray" size="sm" variant="lighter" className={className}>
      BETA
    </Badge>
  );
}
