import { cn } from '@/utils/ui';
import { ChevronDown } from 'lucide-react';
import { ReactNode, useState } from 'react';

interface ActivityDetailCardProps {
  title: ReactNode;
  timestamp?: string;
  expandable?: boolean;
  open?: boolean;
  children?: ReactNode;
}

export function ActivityDetailCard({ title, timestamp, expandable = false, open, children }: ActivityDetailCardProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isExpanded = open ?? internalOpen;

  return (
    <div className="border-1 w-full overflow-hidden rounded-lg border border-neutral-100">
      <div
        className={cn('group flex w-full items-center px-3 py-2 hover:bg-neutral-50', expandable && 'cursor-pointer')}
        onClick={expandable ? () => setInternalOpen(!internalOpen) : undefined}
      >
        <span className="text-foreground-950 flex-1 text-left text-xs font-medium">{title}</span>
        <div className="flex items-center gap-2 pl-3">
          {timestamp && (
            <span className="text-xs text-[#717784] opacity-0 transition-opacity group-hover:opacity-100">
              {timestamp}
            </span>
          )}
          {expandable && (
            <ChevronDown className={cn('h-4 w-4 text-[#717784] transition-transform', isExpanded && 'rotate-180')} />
          )}
        </div>
      </div>
      {isExpanded && children && (
        <div className="border-t border-neutral-200 bg-neutral-50 p-3">
          <div className="text-foreground-600 text-xs">
            <div className="overflow-x-auto">{children}</div>
          </div>
        </div>
      )}
    </div>
  );
}
