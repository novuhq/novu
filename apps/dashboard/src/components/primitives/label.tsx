import * as LabelPrimitives from '@radix-ui/react-label';
import * as React from 'react';
import { cn } from '../../utils/ui';

const LabelRoot = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitives.Root> & {
    disabled?: boolean;
  }
>(({ className, disabled, ...rest }, forwardedRef) => {
  return (
    <LabelPrimitives.Root
      ref={forwardedRef}
      className={cn(
        'text-label-xs text-text-strong group cursor-pointer',
        'flex items-center gap-px',
        // disabled
        'aria-disabled:text-text-disabled',
        className
      )}
      aria-disabled={disabled}
      {...rest}
    />
  );
});
LabelRoot.displayName = 'LabelRoot';

function LabelAsterisk({ className, children, ...rest }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'text-primary-base',
        // disabled
        'group-aria-disabled:text-text-disabled-300',
        className
      )}
      {...rest}
    >
      {children || '*'}
    </span>
  );
}

function LabelSub({ children, className, ...rest }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'text-paragraph-xs text-text-sub',
        // disabled
        'group-aria-disabled:text-text-disabled',
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

export { LabelRoot as Label, LabelAsterisk as LabelAsterisk, LabelSub as LabelSub, LabelRoot as Root };
