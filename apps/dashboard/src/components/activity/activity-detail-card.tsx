import { ChevronDown } from 'lucide-react';
import { ReactNode, useState } from 'react';
import { RiAlertFill, RiInformation2Line } from 'react-icons/ri';
import { cn } from '@/utils/ui';

interface ActivityDetailCardProps {
  title: ReactNode;
  timestamp?: string;
  expandable?: boolean;
  open?: boolean;
  children?: ReactNode;
  footer?: string | null;
  warning?: ReactNode;
}

export function ActivityDetailCard({
  title,
  timestamp,
  expandable = false,
  open,
  children,
  footer,
  warning,
}: ActivityDetailCardProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isExpanded = open ?? internalOpen;

  return (
    <div className="w-full overflow-hidden rounded-lg border border-neutral-100">
      <div
        className={cn('group flex max-h-8 w-full items-center p-2 hover:bg-neutral-50', expandable && 'cursor-pointer')}
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
      {isExpanded && warning && (
        <div className="bg-warning-lighter flex items-start gap-0.5 border-t border-neutral-100 px-1.5 py-[7px]">
          <RiAlertFill className="text-warning-base size-4 shrink-0 p-[3px]" />
          <span className="text-label-xs text-warning-dark">{warning}</span>
        </div>
      )}
      {isExpanded && children && (
        <>
          <div className="border-t border-neutral-100 bg-neutral-50 p-[2px]">
            <div className="text-foreground-600 px-2 py-1 text-xs">
              <div className="overflow-x-auto">{children}</div>
            </div>
          </div>
          {footer && (
            <div className="flex gap-2 items-center border-t border-neutral-100 bg-transparent py-1 px-2">
              <RiInformation2Line className="size-4 text-text-soft" />
              <span className="text-label-xs text-text-soft truncate" title={footer}>
                {footer}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
