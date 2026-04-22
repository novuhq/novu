import { useState } from 'react';
import { RiContractUpDownLine, RiExpandUpDownLine } from 'react-icons/ri';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/primitives/collapsible';

type CollapsibleSectionProps = {
  title: string;
  defaultOpen?: boolean;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export function CollapsibleSection({ title, defaultOpen = true, actions, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="rounded-lg bg-neutral-alpha-50 p-1 space-y-1">
      <div className="flex items-center justify-between px-2 py-1">
        <p className="font-mono text-xs font-medium tracking-tight text-foreground-500 uppercase">{title}</p>
        <div className="flex items-center gap-2">
          {actions}
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="text-foreground-400 hover:text-foreground-900 transition-colors"
              aria-label={isOpen ? `Collapse ${title}` : `Expand ${title}`}
            >
              {isOpen ? <RiContractUpDownLine className="size-3" /> : <RiExpandUpDownLine className="size-3" />}
            </button>
          </CollapsibleTrigger>
        </div>
      </div>

      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}
