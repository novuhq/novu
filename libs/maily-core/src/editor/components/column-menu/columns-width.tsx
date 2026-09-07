import { forwardRef } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

type ColumnsWidthProps = {
  selectedValue: string;
  onValueChange: (value: string) => void;
  tooltip?: string;
};

export function ColumnsWidth(props: ColumnsWidthProps) {
  const { selectedValue, onValueChange, tooltip } = props;

  const content = (
    <label className="mly-relative mly-flex mly-items-center">
      <span className="mly-absolute mly-inset-y-0 mly-left-2 mly-flex mly-items-center mly-text-xs mly-leading-none mly-text-gray-400">
        W
      </span>
      <select
        className="mly-h-auto mly-max-w-28 mly-appearance-none mly-border-0 mly-border-none mly-p-1 mly-pl-[26px] mly-text-sm mly-tabular-nums mly-outline-none focus-visible:mly-outline-none"
        value={selectedValue}
        onChange={(e) => onValueChange(e.target.value)}
      >
        <option value="auto">Fit content</option>
        <option value="100%">Stretch</option>
      </select>
    </label>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span>{content}</span>
        </TooltipTrigger>
        <TooltipContent sideOffset={8}>{tooltip}</TooltipContent>
      </Tooltip>
    );
  }

  return content;
}
