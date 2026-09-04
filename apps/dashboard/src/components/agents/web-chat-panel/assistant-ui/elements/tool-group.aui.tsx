import { type PropsWithChildren, useState } from 'react';
import { RiArrowDownSLine, RiLoader4Line } from 'react-icons/ri';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/primitives/collapsible';
import { cn } from '@/utils/ui';

export function ToolGroupRoot({
  open,
  onOpenChange,
  children,
}: PropsWithChildren<{
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}>) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : uncontrolledOpen;

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={(next) => {
        if (!isControlled) setUncontrolledOpen(next);
        onOpenChange?.(next);
      }}
      className="w-full"
    >
      {children}
    </Collapsible>
  );
}

export function ToolGroupTrigger({ count, active = false }: { count: number; active?: boolean }) {
  const label = `${count} tool ${count === 1 ? 'call' : 'calls'}`;

  return (
    <CollapsibleTrigger className="text-text-soft hover:text-text-strong group flex items-center gap-2 py-1.5 text-sm">
      {active ? <RiLoader4Line className="size-3 shrink-0 animate-spin" /> : null}
      <span className="text-xs leading-none">{label}</span>
      <RiArrowDownSLine className="size-3 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
    </CollapsibleTrigger>
  );
}

export function ToolGroupContent({ children }: PropsWithChildren) {
  return (
    <CollapsibleContent className="overflow-hidden">
      <div className={cn('mt-1 flex flex-col gap-1')}>{children}</div>
    </CollapsibleContent>
  );
}
