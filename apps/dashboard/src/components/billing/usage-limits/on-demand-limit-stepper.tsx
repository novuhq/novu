import { MAX_ON_DEMAND_LIMIT } from '@novu/shared';
import { type InputHTMLAttributes, type Ref, useState } from 'react';
import type { IconType } from 'react-icons';
import { RiAddFill, RiSubtractFill } from 'react-icons/ri';
import { InlineAffix, InputPure, InputRoot, InputWrapper } from '@/components/primitives/input';
import { formatNumber } from '@/utils/number-formatting';
import { cn } from '@/utils/ui';

const ON_DEMAND_LIMIT_STEP = 1000;
const ON_DEMAND_LIMIT_PLACEHOLDER = 'No limit';

/** Raw digits while editing, so re-inserted separators don't move the caret. */
function getDisplayValue(value: number | null, isEditing: boolean): string {
  if (value === null) {
    return '';
  }

  return isEditing ? String(value) : formatNumber(value);
}

type StepButtonProps = {
  icon: IconType;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
};

function StepButton({ icon: Icon, label, onClick, disabled, className }: StepButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-[30px] shrink-0 items-center justify-center border-stroke-weak bg-bg-white text-text-sub transition hover:bg-bg-weak hover:text-text-strong disabled:pointer-events-none disabled:text-text-disabled',
        className
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}

type OnDemandLimitStepperProps = Pick<
  InputHTMLAttributes<HTMLInputElement>,
  'id' | 'name' | 'aria-describedby' | 'aria-invalid'
> & {
  ref?: Ref<HTMLInputElement>;
  value: number | null;
  onChange: (value: number | null) => void;
  onBlur: () => void;
};

export function OnDemandLimitStepper({ ref, value, onChange, onBlur, ...inputProps }: OnDemandLimitStepperProps) {
  const [isEditing, setIsEditing] = useState(false);
  const displayValue = getDisplayValue(value, isEditing);

  return (
    <InputRoot size="xs" className="divide-x-0 rounded-6 p-px">
      <StepButton
        icon={RiSubtractFill}
        label="Decrease limit"
        onClick={() => onChange(Math.max((value ?? 0) - ON_DEMAND_LIMIT_STEP, 0))}
        disabled={!value}
        className="border-r"
      />
      <InputWrapper className="justify-center gap-1 px-3.5">
        {/* The hidden mirror sizes the grid cell to the text, so value and suffix center as one group. */}
        <span className="inline-grid min-w-0">
          <span aria-hidden className="invisible col-start-1 row-start-1 whitespace-pre text-label-xs">
            {displayValue || ON_DEMAND_LIMIT_PLACEHOLDER}
          </span>
          <InputPure
            {...inputProps}
            ref={ref}
            inputMode="numeric"
            placeholder={ON_DEMAND_LIMIT_PLACEHOLDER}
            value={displayValue}
            onFocus={() => setIsEditing(true)}
            onBlur={() => {
              setIsEditing(false);
              onBlur();
            }}
            onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, '');
              onChange(digits === '' ? null : Math.min(Number(digits), MAX_ON_DEMAND_LIMIT));
            }}
            className="col-start-1 row-start-1 h-8 w-0 min-w-full text-center text-label-xs mask-none"
          />
        </span>
        <InlineAffix className="whitespace-nowrap text-label-xs text-text-soft">runs / month</InlineAffix>
      </InputWrapper>
      <StepButton
        icon={RiAddFill}
        label="Increase limit"
        onClick={() => onChange(Math.min((value ?? 0) + ON_DEMAND_LIMIT_STEP, MAX_ON_DEMAND_LIMIT))}
        disabled={value !== null && value >= MAX_ON_DEMAND_LIMIT}
        className="border-l"
      />
    </InputRoot>
  );
}
