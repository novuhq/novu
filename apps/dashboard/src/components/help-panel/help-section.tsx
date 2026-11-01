import { Command as CommandPrimitive } from 'cmdk';
import type { ReactNode } from 'react';
import { cn } from '@/utils/ui';

type HelpSectionProps = {
  heading?: string;
  children: ReactNode;
};

export function HelpSection({ heading, children }: HelpSectionProps) {
  return (
    <CommandPrimitive.Group
      heading={heading}
      className={cn(
        'flex flex-col gap-0.5 border-t border-stroke-weak bg-bg-white first:border-t-0',
        '[&_[cmdk-group-items]]:flex [&_[cmdk-group-items]]:flex-col [&_[cmdk-group-items]]:gap-0.5',
        '[&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pl-2.5 [&_[cmdk-group-heading]]:pt-2.5',
        '[&_[cmdk-group-heading]]:text-subheading-2xs [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.22px] [&_[cmdk-group-heading]]:text-text-soft',
        heading ? 'px-1.5 pb-1.5 pt-0.5' : 'p-1.5'
      )}
    >
      {children}
    </CommandPrimitive.Group>
  );
}
