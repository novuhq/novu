import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { Filters } from '../types';

type FilterItemProps = {
  filter: Filters;
};

export function FilterItem({ filter }: FilterItemProps) {
  return (
    <div className="flex items-start gap-3 py-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-baseline justify-between gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help text-xs font-medium">{filter.label}</span>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-mono text-[10px]">
              {filter.example}
            </TooltipContent>
          </Tooltip>
        </div>
        <p className="text-text-sub truncate text-[11px]">{filter.description}</p>
      </div>
    </div>
  );
}
