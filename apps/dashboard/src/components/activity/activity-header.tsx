import { RiRouteFill } from 'react-icons/ri';

import { cn } from '@/utils/ui';

export const ActivityHeader = ({ title, className }: { title?: string; className?: string }) => {
  return (
    <header
      className={cn(
        'flex items-center gap-2 border-b border-t border-neutral-200 border-b-neutral-100 px-3 pb-2 pt-[7px]',
        className
      )}
    >
      <RiRouteFill className="h-3 w-3" />
      <span className="text-foreground-950 text-sm font-medium">{title || 'Deleted workflow'}</span>
    </header>
  );
};
