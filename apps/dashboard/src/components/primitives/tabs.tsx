import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

import { cn } from '@/utils/ui';

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'border-neutral-alpha-200 inline-flex w-full items-center justify-start gap-6 border-b border-t px-3.5',
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "text-foreground-600 ring-offset-background focus-visible:ring-ring data-[state=active]:text-foreground data-[state=active]:after:border-primary data-[state=active]:text-foreground-950 relative inline-flex items-center justify-center whitespace-nowrap rounded-md py-3.5 text-sm font-medium transition-all duration-300 ease-out after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:border-b-2 after:border-b-transparent after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content ref={ref} className={cn('mt-2 focus-visible:outline-none', className)} {...props} />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>
>(({ className, ...props }, ref) => <TabsPrimitive.Root ref={ref} className={cn('', className)} {...props} />);
Tabs.displayName = TabsPrimitive.Root.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
