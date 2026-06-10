import { ReactNode, useState } from 'react';
import { RiArrowDownSLine, RiArrowRightSLine } from 'react-icons/ri';
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
      <CollapsibleTrigger className="flex w-full cursor-pointer items-center gap-1 px-2 py-1 focus-visible:outline-hidden">
        <span className="text-text-soft text-sm font-medium">{label}</span>
        {isOpen ? (
          <RiArrowDownSLine className="text-text-soft size-3.5" />
        ) : (
          <RiArrowRightSLine className="text-text-soft size-3.5" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col">{children}</CollapsibleContent>
    </Collapsible>
  );
}
