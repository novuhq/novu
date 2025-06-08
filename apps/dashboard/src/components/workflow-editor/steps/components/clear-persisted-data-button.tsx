import { Button } from '@/components/primitives/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { RiDeleteBin6Line } from 'react-icons/ri';

type ClearPersistedDataButtonProps = {
  onClear: () => void;
  disabled?: boolean;
};

export function ClearPersistedDataButton({ onClear, disabled }: ClearPersistedDataButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="secondary"
          mode="ghost"
          size="xs"
          onClick={onClear}
          disabled={disabled}
          className="text-foreground-400 hover:text-foreground-600 h-6 w-6 p-0"
        >
          <RiDeleteBin6Line className="h-3 w-3" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-xs">
        Clear saved preview data for this step
      </TooltipContent>
    </Tooltip>
  );
}
