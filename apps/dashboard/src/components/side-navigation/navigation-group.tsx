import { ReactNode, useState } from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/primitives/collapsible';

const STORAGE_KEY_PREFIX = 'nv_side_nav_group_collapsed:';

function loadIsCollapsed(label: string) {
  try {
    return localStorage.getItem(`${STORAGE_KEY_PREFIX}${label}`) === 'true';
  } catch {
    return false;
  }
}

function saveIsCollapsed(label: string, isCollapsed: boolean) {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${label}`, String(isCollapsed));
  } catch {
    // ignore storage errors
  }
}

type NavigationGroupProps = {
  children: ReactNode;
  label?: string;
};

export function NavigationGroup({ children, label }: NavigationGroupProps) {
  const [isOpen, setIsOpen] = useState(() => (label ? !loadIsCollapsed(label) : true));

  if (!label) {
    return <div className="flex flex-col last:mt-auto">{children}</div>;
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    saveIsCollapsed(label, !open);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={handleOpenChange} className="flex flex-col last:mt-auto">
      <CollapsibleTrigger className="group flex w-full cursor-pointer items-center gap-1 px-2 py-1 focus-visible:outline-hidden">
        <span className="text-text-soft text-sm font-medium">{label}</span>
        <RiArrowRightSLine className="text-text-soft size-3.5 transition-transform duration-200 ease-out group-data-[state=open]:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent className="group/content overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        <div className="flex flex-col transition-opacity duration-200 ease-out group-data-[state=closed]/content:opacity-0">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
