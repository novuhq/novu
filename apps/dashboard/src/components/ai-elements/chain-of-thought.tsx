'use client';

import { useControllableState } from '@radix-ui/react-use-controllable-state';
import { DotIcon, type LucideIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { createContext, memo, useContext, useEffect, useMemo, useState } from 'react';
import { IconType } from 'react-icons/lib';
import { RiArrowRightSLine } from 'react-icons/ri';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/primitives/collapsible';
import { cn } from '@/utils/ui';

interface ChainOfThoughtContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const ChainOfThoughtContext = createContext<ChainOfThoughtContextValue | null>(null);

const useChainOfThought = () => {
  const context = useContext(ChainOfThoughtContext);
  if (!context) {
    throw new Error('ChainOfThought components must be used within ChainOfThought');
  }
  return context;
};

export type ChainOfThoughtProps = ComponentProps<'div'> & {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export const ChainOfThought = memo(
  ({ className, open, defaultOpen = false, onOpenChange, children, ...props }: ChainOfThoughtProps) => {
    const [isOpen, setIsOpen] = useControllableState({
      prop: open,
      defaultProp: defaultOpen,
      onChange: onOpenChange,
    });

    const chainOfThoughtContext = useMemo(() => ({ isOpen, setIsOpen }), [isOpen, setIsOpen]);

    return (
      <ChainOfThoughtContext.Provider value={chainOfThoughtContext}>
        <div className={cn('not-prose max-w-prose space-y-4', className)} {...props}>
          {children}
        </div>
      </ChainOfThoughtContext.Provider>
    );
  }
);

export type ChainOfThoughtStepProps = ComponentProps<'div'> & {
  icon?: IconType | LucideIcon;
  label?: ReactNode;
  description?: ReactNode;
  status?: 'complete' | 'active' | 'pending' | 'error';
  collapsible?: boolean;
  defaultOpen?: boolean;
  autoCollapse?: boolean;
};

export const ChainOfThoughtStep = memo(
  ({
    className,
    icon: Icon = DotIcon,
    label,
    description,
    status = 'complete',
    collapsible = false,
    autoCollapse = false,
    defaultOpen = true,
    children,
    ...props
  }: ChainOfThoughtStepProps) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    useEffect(() => {
      if (autoCollapse && (status === 'complete' || status === 'error')) {
        setIsOpen(false);
      }
    }, [autoCollapse, status]);

    const statusStyles = {
      complete: 'text-muted-foreground',
      active: 'text-foreground',
      pending: 'text-muted-foreground/50',
      error: 'text-muted-foreground',
    };

    return (
      <div
        className={cn(
          'flex gap-2 text-sm [&:not(:last-child)_.line]:min-h-2',
          statusStyles[status],
          'fade-in-0 slide-in-from-top-2 animate-in',
          className
        )}
        {...props}
      >
        {collapsible && children ? (
          <Collapsible className="group flex flex-1 gap-2 w-full" open={isOpen} onOpenChange={setIsOpen}>
            <div className="relative shrink-0 self-stretch">
              <CollapsibleTrigger className="block p-0 transition-opacity hover:opacity-80 h-5">
                <Icon className="size-4 transition-transform text-text-soft cursor-pointer" />
              </CollapsibleTrigger>
              <div className="line absolute top-5.5 bottom-0 left-1/2 -mx-px w-px bg-bg-soft" />
            </div>
            <div className="relative flex min-w-0 flex-1 flex-col">
              {!!label && (
                <CollapsibleTrigger
                  className={cn(
                    'flex items-center w-full gap-1 text-left transition-opacity hover:opacity-80 h-5 cursor-pointer'
                  )}
                >
                  <div className="min-w-0">{label}</div>
                  <RiArrowRightSLine className="size-3.5 transition-transform group-data-[state=open]:rotate-90 text-text-soft" />
                </CollapsibleTrigger>
              )}
              <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                <div className="flex-1 space-y-2 overflow-hidden">
                  {description && <div className="text-muted-foreground text-xs">{description}</div>}
                  {children}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ) : (
          <>
            <div className="relative mt-0.5">
              <Icon className="size-4" />
              <div className="line absolute top-5.5 bottom-0 left-1/2 -mx-px w-px bg-bg-soft" />
            </div>
            <div className="flex-1 space-y-2 overflow-hidden">
              {label && <div>{label}</div>}
              {description && <div className="text-muted-foreground text-xs">{description}</div>}
              {children}
            </div>
          </>
        )}
      </div>
    );
  }
);

export type ChainOfThoughtContentProps = ComponentProps<typeof CollapsibleContent>;

export const ChainOfThoughtContent = memo(({ className, children, ...props }: ChainOfThoughtContentProps) => {
  const { isOpen } = useChainOfThought();

  return (
    <Collapsible open={isOpen}>
      <CollapsibleContent
        className={cn(
          'mt-2 space-y-3',
          'data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in',
          className
        )}
        {...props}
      >
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
});

ChainOfThought.displayName = 'ChainOfThought';
ChainOfThoughtStep.displayName = 'ChainOfThoughtStep';
ChainOfThoughtContent.displayName = 'ChainOfThoughtContent';
