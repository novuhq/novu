import { ReactNode } from 'react';
import { HelpTooltipIndicator } from '../../primitives/help-tooltip-indicator';

type ChartEmptyStateProps = {
  title?: string;
  children: ReactNode;
  tooltip?: React.ReactNode;
};

export function ChartEmptyState({ title = 'Not enough data to show', children, tooltip }: ChartEmptyStateProps) {
  return (
    <div className="relative h-[160px] w-full">
      <div className="opacity-5">{children}</div>

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="rounded border border-solid border-[#e1e4ea] bg-white px-2 py-1 flex items-center gap-1">
          <p className="text-[10px] font-medium leading-[14px] text-[#99a0ae]">{title}</p>
          {tooltip && <HelpTooltipIndicator text={tooltip} size="3" />}
        </div>
      </div>
    </div>
  );
}
