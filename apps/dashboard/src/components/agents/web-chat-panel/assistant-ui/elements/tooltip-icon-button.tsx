import { type ComponentPropsWithRef, forwardRef } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { cn } from '@/utils/ui';

type TooltipIconButtonProps = Omit<ComponentPropsWithRef<'button'>, 'children'> & {
  tooltip: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  children?: React.ReactNode;
};

export const TooltipIconButton = forwardRef<HTMLButtonElement, TooltipIconButtonProps>(
  ({ children, tooltip, side = 'bottom', className, type = 'button', ...rest }, ref) => {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            ref={ref}
            type={type}
            className={cn(
              'text-text-sub hover:bg-bg-weak hover:text-text-strong inline-flex size-6 items-center justify-center rounded-md p-1',
              className
            )}
            {...rest}
          >
            {children}
            <span className="sr-only">{tooltip}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side={side}>{tooltip}</TooltipContent>
      </Tooltip>
    );
  }
);

TooltipIconButton.displayName = 'TooltipIconButton';
