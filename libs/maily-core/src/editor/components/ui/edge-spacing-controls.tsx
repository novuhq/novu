/* cspell:ignore nums */
import { ChevronUp } from 'lucide-react';
import { useId } from 'react';
import { cn } from '@/editor/utils/classname';
import { AUTOCOMPLETE_PASSWORD_MANAGERS_OFF } from '@/editor/utils/constants';
import { Popover, PopoverContent, PopoverTrigger } from '../popover';
import { Divider } from './divider';

type EdgeSpacingControlProps = {
  top?: number;
  onTopValueChange?: (top: number) => void;
  right?: number;
  onRightValueChange?: (right: number) => void;
  bottom?: number;
  onBottomValueChange?: (bottom: number) => void;
  left?: number;
  onLeftValueChange?: (left: number) => void;
};

export function EdgeSpacingControl(props: EdgeSpacingControlProps) {
  const { top, onTopValueChange, right, onRightValueChange, bottom, onBottomValueChange, left, onLeftValueChange } =
    props;

  return (
    <Popover>
      <PopoverTrigger className="mly-rounded hover:mly-bg-gray-100">
        <ChevronUp size={14} />
      </PopoverTrigger>
      <PopoverContent
        className="mly-flex mly-max-w-max mly-gap-0.5 mly-rounded-md mly-border mly-border-gray-200 !mly-p-0.5 mly-shadow-none"
        side="top"
        sideOffset={8}
      >
        <InputWithLabel
          label="T"
          value={top ?? 0}
          onChange={(value) => onTopValueChange?.(value)}
          inputClassName="mly-rounded"
        />
        <InputWithLabel
          label="R"
          value={right ?? 0}
          onChange={(value) => onRightValueChange?.(value)}
          inputClassName="mly-rounded"
        />
        <InputWithLabel
          label="B"
          value={bottom ?? 0}
          onChange={(value) => onBottomValueChange?.(value)}
          inputClassName="mly-rounded"
        />
        <InputWithLabel
          label="L"
          value={left ?? 0}
          onChange={(value) => onLeftValueChange?.(value)}
          inputClassName="mly-rounded"
        />
      </PopoverContent>
    </Popover>
  );
}

type InputWithLabelProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  className?: string;
  inputClassName?: string;
};

function InputWithLabel(props: InputWithLabelProps) {
  const { label, value, onChange, className, inputClassName } = props;

  const id = `${label}${useId()}`;

  return (
    <div className={cn('mly-flex mly-flex-col mly-items-center mly-gap-1', className)}>
      <input
        {...AUTOCOMPLETE_PASSWORD_MANAGERS_OFF}
        id={id}
        min={0}
        type="number"
        // Error: https://github.com/facebook/react/issues/9402
        // adding `+ ''` to convert number to string so that number don't have leading zero(0)
        value={value + ''}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          'hide-number-controls focus-visible:outline-none mly-size-5 mly-border-0 mly-border-none mly-bg-gray-200 mly-p-0.5 mly-text-center mly-text-xs mly-tabular-nums mly-outline-none',
          inputClassName
        )}
      />
      <label className="mly-text-[10px] mly-leading-none mly-text-gray-500" htmlFor={id}>
        {label}
      </label>
    </div>
  );
}
