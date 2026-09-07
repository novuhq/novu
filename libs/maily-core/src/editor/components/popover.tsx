'use client';

import * as PopoverPrimitive from '@radix-ui/react-popover';
import * as React from 'react';

import { cn } from '../utils/classname';

const Popover: React.FC<React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Root>> = PopoverPrimitive.Root;

const PopoverTrigger: React.FC<React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger>> =
  PopoverPrimitive.Trigger;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'center', sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'mly-z-[9999] mly-w-72 mly-rounded-md mly-border mly-border-gray-200 mly-bg-white mly-p-4 mly-text-gray-950 mly-shadow-md mly-outline-none',
        'mly-editor',
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
)) as React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> &
    React.RefAttributes<React.ElementRef<typeof PopoverPrimitive.Content>>
>;

PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent };
