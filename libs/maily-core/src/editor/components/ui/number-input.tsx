/* cspell:ignore nums */
import { type LucideIcon } from 'lucide-react';
import { forwardRef } from 'react';
import { AUTOCOMPLETE_PASSWORD_MANAGERS_OFF } from '@/editor/utils/constants';
import { SVGIcon } from '../icons/grid-lines';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

type NumberInputProps = {
  value: number;
  onValueChange: (value: number) => void;
  icon?: LucideIcon | SVGIcon;
  max?: number;

  tooltip?: string;
};

export const NumberInput = forwardRef<HTMLLabelElement, NumberInputProps>((props, ref) => {
  const { value, onValueChange, icon: Icon, max, tooltip } = props;

  const content = (
    <label ref={ref} className="mly-relative mly-flex mly-items-center mly-gap-1">
      {Icon ? <Icon className="mly-h-3 mly-w-3 mly-stroke-[2.5]" /> : null}
      <input
        {...AUTOCOMPLETE_PASSWORD_MANAGERS_OFF}
        min={0}
        {...(max ? { max } : {})}
        type="number"
        // Error: https://github.com/facebook/react/issues/9402
        // adding `+ ''` to convert number to string so that number don't have leading zero(0)
        value={value === 0 ? '' : value + ''}
        placeholder="-"
        onChange={(e) => {
          const newValue = e.target.value === '' ? 0 : Number(e.target.value);
          onValueChange(max !== undefined ? Math.min(newValue, max) : newValue);
        }}
        onFocus={(e) => e.target.select()}
        className="hide-number-controls focus-visible:outline-none mly-h-5 mly-w-8 mly-rounded-md mly-bg-soft-gray mly-px-1.5 mly-text-center mly-text-xs mly-tabular-nums mly-text-midnight-gray placeholder:mly-text-midnight-gray"
      />
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
});

NumberInput.displayName = 'NumberInput';
