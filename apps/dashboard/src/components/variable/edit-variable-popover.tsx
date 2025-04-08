import { Popover, PopoverTrigger } from '@/components/primitives/popover';
import { EditVariablePopoverContent } from '@/components/variable/edit-variable-popover-content';
import { IsAllowedVariable } from '@/utils/parseStepVariables';
import { ReactNode } from 'react';

type EditVariablePopoverProps = {
  children: ReactNode;
  open: boolean;
  variable?: string;
  onOpenChange: (open: boolean) => void;
  onUpdate: (newValue: string) => void;
  isAllowedVariable: IsAllowedVariable;
};

export const EditVariablePopover = ({
  children,
  open,
  onOpenChange,
  variable,
  onUpdate,
  isAllowedVariable,
}: EditVariablePopoverProps) => {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <EditVariablePopoverContent
        variable={variable}
        onUpdate={onUpdate}
        isAllowedVariable={isAllowedVariable}
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          event.stopPropagation();

          onOpenChange(false);
        }}
      />
    </Popover>
  );
};
