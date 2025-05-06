import { cn } from '../../../../../utils/ui';
import { SizeType } from '../types';
import { STYLES } from '../styles';
import { Button } from '../../../button';

interface ClearButtonProps {
  onClick: () => void;
  size: SizeType;
  label?: string;
  className?: string;
  separatorClassName?: string;
}

export function ClearButton({ onClick, size, label = 'Clear filter', className }: ClearButtonProps) {
  return (
    <Button
      variant="secondary"
      mode="ghost"
      size="2xs"
      onClick={onClick}
      className={cn(STYLES.clearButton, STYLES.size[size].input, className)}
    >
      {label}
    </Button>
  );
}
