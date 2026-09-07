import * as SwitchPrimitives from '@radix-ui/react-switch';
import * as React from 'react';
import { cn } from '@/lib/utils';

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, checked, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn('peer inline-flex shrink-0 cursor-pointer items-center rounded-full transition-colors', className)}
    checked={checked}
    style={{
      width: '44px',
      height: '24px',
      backgroundColor: checked ? '#22c55e' : '#d1d5db',
      padding: '2px',
    }}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      style={{
        display: 'block',
        width: '20px',
        height: '20px',
        backgroundColor: 'white',
        borderRadius: '50%',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        transition: 'transform 0.2s',
        transform: checked ? 'translateX(20px)' : 'translateX(0px)',
      }}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
