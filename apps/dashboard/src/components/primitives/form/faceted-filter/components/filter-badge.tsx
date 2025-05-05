import { cn } from '../../../../../utils/ui';
import { Badge } from '../../../badge';
import { STYLES } from '../styles';
import { SizeType } from '../types';

interface FilterBadgeProps {
  content: React.ReactNode;
  size: SizeType;
  className?: string;
}

export function FilterBadge({ content, size, className }: FilterBadgeProps) {
  return (
    <Badge
      variant="lighter"
      color="gray"
      className={cn(
        'rounded-md border-neutral-100 bg-neutral-50 font-normal text-neutral-600 shadow-none',
        'transition-colors duration-200 ease-out',
        'hover:text-neutral-650 hover:border-neutral-200/70 hover:bg-neutral-100/50',
        STYLES.size[size].badge,
        className
      )}
    >
      {content}
    </Badge>
  );
}
