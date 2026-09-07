import * as AccordionPrimitive from '@radix-ui/react-accordion';
import * as React from 'react';
import { RiArrowDownSLine } from 'react-icons/ri';

import { cn } from '@/utils/ui';

const Accordion = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Root>
>((props, ref) => <AccordionPrimitive.Root ref={ref} {...props} />);
Accordion.displayName = AccordionPrimitive.Root.displayName;

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn('bg-neutral-alpha-50 flex flex-col gap-2 rounded-lg border border-neutral-200 p-2', className)}
    {...props}
  />
));
AccordionItem.displayName = 'AccordionItem';

type AccordionTriggerProps = React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> & {
  withChevron?: boolean;
  rightSlot?: React.ReactNode;
};

const AccordionTrigger = React.forwardRef<React.ElementRef<typeof AccordionPrimitive.Trigger>, AccordionTriggerProps>(
  ({ className, children, withChevron = true, rightSlot, ...props }, ref) => (
    <AccordionPrimitive.Header className="flex w-full items-center">
      <AccordionPrimitive.Trigger
        ref={ref}
        className={cn('flex min-w-0 flex-1 items-center text-xs transition-all', className)}
        {...props}
      >
        {children}
      </AccordionPrimitive.Trigger>
      {rightSlot}
      {withChevron && (
        <AccordionPrimitive.Trigger className="flex h-4 w-4 shrink-0 items-center justify-center text-xs transition-all [&[data-state=open]>svg]:rotate-180">
          <RiArrowDownSLine className="text-foreground-400 h-4 w-4 transition-transform duration-200" />
        </AccordionPrimitive.Trigger>
      )}
    </AccordionPrimitive.Header>
  )
);
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden text-sm"
    {...props}
  >
    <div className={cn('pt-0', className)}>{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
