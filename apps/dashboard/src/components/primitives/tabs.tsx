import { Slottable } from '@radix-ui/react-slot';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cva, VariantProps } from 'class-variance-authority';
import mergeRefs from 'merge-refs';
import * as React from 'react';
import { useTabObserver } from '@/hooks/use-tab-observer';
import { cn } from '@/utils/ui';
import { SegmentedControlList } from './segmented-control';

const tabsListVariants = cva('inline-flex', {
  variants: {
    variant: {
      default: 'relative isolate rounded-[10px] bg-neutral-alpha-100 p-1 text-muted-foreground',
      regular: 'relative border-neutral-alpha-200 w-full justify-start gap-6 border-b border-t px-3.5',
    },
    align: {
      center: 'justify-center',
      start: 'justify-start',
      end: 'justify-end',
    },
  },
  defaultVariants: {
    variant: 'default',
    align: 'start',
  },
});

type TabsListProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants> & {
    floatingBgClassName?: string;
  };

const TabsList = React.forwardRef<React.ElementRef<typeof TabsPrimitive.List>, TabsListProps>(
  ({ className, variant, align, floatingBgClassName, ...props }, forwardedRef) => {
    const [lineStyle, setLineStyle] = React.useState({ width: 0, left: 0 });
    const { mounted, listRef } = useTabObserver({
      onActiveTabChange: (_, activeTab) => {
        const { offsetWidth: width, offsetLeft: left } = activeTab;
        setLineStyle({ width, left });
      },
    });

    if (variant === 'default' || !variant) {
      return (
        <SegmentedControlList
          ref={forwardedRef}
          className={tabsListVariants({ variant, align, className })}
          floatingBgClassName={floatingBgClassName}
          {...props}
        />
      );
    }

    return (
      <TabsPrimitive.List
        ref={mergeRefs(forwardedRef, listRef)}
        className={tabsListVariants({ variant, align, className })}
        {...props}
      >
        <Slottable>{props.children}</Slottable>
        <div
          className={cn('bg-primary absolute bottom-0 left-0 h-[2px] transition-all duration-300', {
            hidden: !mounted,
          })}
          style={{
            transform: `translate3d(${lineStyle.left}px, 0, 0)`,
            width: `${lineStyle.width}px`,
            transitionTimingFunction: 'cubic-bezier(0.65, 0, 0.35, 1)',
          }}
          aria-hidden="true"
        />
      </TabsPrimitive.List>
    );
  }
);
TabsList.displayName = TabsPrimitive.List.displayName;

const tabsTriggerVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium ring-offset-background transition-all text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        default: 'py-1 data-[state=active]:text-foreground-950 data-[state=inactive]:text-foreground-400',
        regular:
          'text-foreground-600 data-[state=active]:text-foreground-950 relative py-3.5 transition-colors duration-300 ease-out px-1',
      },
      size: {
        xl: 'h-12.5 text-label-sm',
        lg: 'h-11 text-label-sm',
        md: 'h-7 text-label-sm',
        sm: 'h-6 text-label-xs',
        xs: 'h-5 text-label-xs',
      },
    },

    defaultVariants: {
      variant: 'default',
      size: 'md',
    },

    compoundVariants: [
      {
        variant: 'default',
        size: ['xl', 'lg', 'md'],
        class: 'px-3',
      },
      {
        variant: 'default',
        size: 'sm',
        class: 'px-1.5',
      },
      {
        variant: 'default',
        size: 'xs',
        class: 'px-1',
      },
    ],
  }
);

type TabsTriggerProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> &
  VariantProps<typeof tabsTriggerVariants>;

const TabsTrigger = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Trigger>, TabsTriggerProps>(
  ({ className, variant, size, ...props }, ref) => (
    <TabsPrimitive.Trigger ref={ref} className={cn(tabsTriggerVariants({ variant, size, className }))} {...props} />
  )
);
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const tabsContentVariants = cva('focus-visible:outline-none', {
  variants: {
    variant: {
      default: '',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

type TabsContentProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content> &
  VariantProps<typeof tabsContentVariants>;

const TabsContent = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Content>, TabsContentProps>(
  ({ className, variant, ...props }, ref) => (
    <TabsPrimitive.Content ref={ref} className={tabsContentVariants({ variant, className })} {...props} />
  )
);
TabsContent.displayName = TabsPrimitive.Content.displayName;

const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>
>(({ className, ...props }, ref) => <TabsPrimitive.Root ref={ref} className={cn('', className)} {...props} />);
Tabs.displayName = TabsPrimitive.Root.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
