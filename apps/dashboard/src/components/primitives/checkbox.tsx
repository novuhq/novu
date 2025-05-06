import React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { RiCheckLine, RiSubtractLine } from 'react-icons/ri';
import { cn } from '@/utils/ui';

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'focus-visible:ring-ring data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground group peer h-4 w-4 shrink-0 rounded-sm bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className={cn('flex items-center justify-center')}>
      <RiCheckLine className="hidden h-4 w-4 group-data-[state=checked]:block" />
      <RiSubtractLine className="hidden h-4 w-4 text-white group-data-[state=indeterminate]:block" />
    </CheckboxPrimitive.Indicator>
    <RiSubtractLine className="hidden h-4 w-4 text-white group-disabled:block group-data-[state=unchecked]:block" />
  </CheckboxPrimitive.Root>
));

Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
