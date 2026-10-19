import { Check, ChevronsUpDown, LucideIcon } from 'lucide-react';
import { useId } from 'react';
import { cn } from '@/editor/utils/classname';
import { SVGIcon } from '../icons/grid-lines';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './dropdown-menu';
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
  chevronClassName?: string;
  /** Stretch to the parent width (Actions form fields). Default hugs content. */
  fullWidth?: boolean;
  /**
   * Keep the menu in-tree (no portal). Use inside Tippy bubble menus so opening
   * the dropdown does not dismiss the parent bubble.
   */
  portalled?: boolean;
};

export function Select(props: SelectProps) {
  const {
    label,
    options,
    value,
    onValueChange,
    tooltip,
    className,
    icon: Icon,
    iconClassName,
    chevronClassName,
    fullWidth = false,
    portalled = true,
  } = props;

  const selectId = `mly${useId()}`;
  const selectedOption = options.find((option) => option.value === value);
  const selectedLabel = selectedOption?.label ?? value;

  const select = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          id={selectId}
          type="button"
          aria-label={label}
          className={cn(
            'mly-box-border mly-flex mly-h-7 mly-min-h-7 mly-items-center mly-gap-1 mly-overflow-hidden mly-rounded-md mly-bg-white mly-px-1.5 mly-py-0 mly-pr-1.5 mly-text-left mly-text-sm mly-text-midnight-gray mly-transition-colors hover:mly-bg-soft-gray focus-visible:mly-outline-none focus-visible:mly-ring-2 focus-visible:mly-ring-gray-400 focus-visible:mly-ring-offset-2 data-[state=open]:mly-bg-soft-gray',
            fullWidth ? 'mly-w-full' : 'mly-max-w-max',
            className
          )}
        >
          {Icon && <Icon className={cn('mly-size-3 mly-shrink-0', iconClassName)} />}
          <span className="mly-min-w-0 mly-flex-1 mly-truncate">{selectedLabel}</span>
          <ChevronsUpDown
            className={cn('mly-size-2.5 mly-shrink-0 mly-text-gray-600', chevronClassName)}
            strokeWidth={2}
            aria-hidden="true"
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={4}
        portalled={portalled}
        className={cn(
          'mly-z-[10000] mly-min-w-[8rem] mly-border-gray-200 mly-p-1 mly-shadow-md',
          fullWidth && 'mly-w-[var(--radix-dropdown-menu-trigger-width)]'
        )}
      >
        {options.map((option) => {
          const isSelected = option.value === value;

          return (
            <DropdownMenuItem
              key={option.value}
              className="mly-cursor-pointer mly-justify-between mly-gap-2 mly-text-xs focus:mly-bg-soft-gray"
              onSelect={() => onValueChange(option.value)}
            >
              <span className="mly-truncate">{option.label}</span>
              {isSelected && <Check className="mly-size-3.5 mly-shrink-0 mly-text-midnight-gray" strokeWidth={2.5} />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (!tooltip) {
    return select;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('mly-inline-flex', fullWidth && 'mly-flex mly-w-full')}>{select}</span>
      </TooltipTrigger>
      <TooltipContent sideOffset={8}>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
