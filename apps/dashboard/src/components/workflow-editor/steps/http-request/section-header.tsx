import { ReactNode } from 'react';
import { RiInformation2Line } from 'react-icons/ri';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';

type SectionHeaderProps = {
  label: string;
  tooltip?: string;
  rightSlot?: ReactNode;
};

export function SectionHeader({ label, tooltip, rightSlot }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-px px-1 py-1">
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <span className="text-text-sub text-xs font-medium">{label}</span>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="flex items-center">
                <RiInformation2Line className="text-text-soft size-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
          </Tooltip>
        )}
      </div>
      {rightSlot}
    </div>
  );
}
