import { ChevronDownIcon, LucideIcon } from 'lucide-react';
import { useId } from 'react';
import { cn } from '@/editor/utils/classname';
import { SVGIcon } from '../icons/grid-lines';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

type SelectProps = {
  label: string;
  options: {
    value: string;
    label: string;
  }[];

  value: string;
  onValueChange: (value: string) => void;

  tooltip?: string;
  className?: string;

  icon?: LucideIcon | SVGIcon;
  iconClassName?: string;
};

export function Select(props: SelectProps) {
  const { label, options, value, onValueChange, tooltip, className, icon: Icon, iconClassName } = props;

  const selectId = `mly${useId()}`;

  const content = (
    <div className="mly-relative">
      <label htmlFor={selectId} className="mly-sr-only">
        {label}
      </label>

      {Icon && (
        <div className="mly-pointer-events-none mly-absolute mly-inset-y-0 mly-left-2 mly-z-20 mly-flex mly-items-center">
          <Icon className={cn('mly-size-3', iconClassName)} />
        </div>
      )}

      <select
        id={selectId}
        className={cn(
          'mly-flex mly-min-h-7 mly-max-w-max mly-appearance-none mly-items-center mly-rounded-md mly-bg-white mly-px-1.5 mly-py-0.5 mly-pr-7 mly-text-sm mly-text-midnight-gray mly-ring-offset-white mly-transition-colors hover:mly-bg-soft-gray focus-visible:mly-relative focus-visible:mly-z-10 focus-visible:mly-outline-none focus-visible:mly-ring-2 focus-visible:mly-ring-gray-400 focus-visible:mly-ring-offset-2 active:mly-bg-soft-gray',
          !!Icon && 'mly-pl-7',
          className
        )}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <span className="mly-pointer-events-none mly-absolute mly-inset-y-0 mly-right-0 mly-z-10 mly-flex mly-h-full mly-w-7 mly-items-center mly-justify-center mly-text-gray-600 peer-disabled:mly-opacity-50">
        <ChevronDownIcon size={16} strokeWidth={2} aria-hidden="true" role="img" />
      </span>
    </div>
  );

  if (!tooltip) {
    return content;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent sideOffset={8}>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
