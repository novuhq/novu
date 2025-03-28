import { Popover, PopoverTrigger } from '@/components/primitives/popover';
import { EditVariablePopoverContent } from '@/components/variable/edit-variable-popover-content';
import { LiquidVariable } from '@/utils/parseStepVariablesToLiquidVariables';
import { ReactNode } from 'react';

type EditVariablePopoverProps = {
  children: ReactNode;
  open: boolean;
  variable?: string;
  variables: LiquidVariable[];
  namespaces: LiquidVariable[];
  onOpenChange: (open: boolean) => void;
  onUpdate: (newValue: string) => void;
};

export const EditVariablePopover = ({
  children,
  open,
  onOpenChange,
  variable,
  onUpdate,
  variables,
  namespaces,
}: EditVariablePopoverProps) => {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <EditVariablePopoverContent
        variable={variable}
        onUpdate={onUpdate}
        variables={variables}
        namespaces={namespaces}
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          event.stopPropagation();

          onOpenChange(false);
        }}
      />
    </Popover>
  );
};
