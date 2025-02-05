import { ReactNode } from 'react';
import { Popover, PopoverTrigger } from '@/components/primitives/popover';
import { EditVariablePopoverContent } from '@/components/variable/edit-variable-popover-content';

type EditVariablePopoverProps = {
  children: ReactNode;
  open: boolean;
  variable?: string;
  onOpenChange: (open: boolean) => void;
  onUpdate: (newValue: string) => void;
};

export const EditVariablePopover = ({ children, open, onOpenChange, variable, onUpdate }: EditVariablePopoverProps) => {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <EditVariablePopoverContent
        variable={variable}
        onUpdate={onUpdate}
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          event.stopPropagation();

          onOpenChange(false);
        }}
      />
    </Popover>
  );
};
