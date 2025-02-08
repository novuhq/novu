import { FocusEventHandler } from 'react';
import { useFormContext } from 'react-hook-form';

import { FormControl, FormField, FormItem, FormMessagePure } from '@/components/primitives/form/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { AUTOCOMPLETE_PASSWORD_MANAGERS_OFF } from '@/utils/constants';
import { cn } from '@/utils/ui';
import { InputPure } from './primitives/input';

const HEIGHT = {
  sm: {
    base: 'h-7',
    trigger: 'h-[26px]',
  },
  md: {
    base: 'h-9',
    trigger: 'h-[34px]',
  },
} as const;

type InputWithSelectProps = {
  fields: {
    inputKey: string;
    selectKey: string;
  };
  options: Array<{ label: string; value: string }>;
  defaultOption?: string;
  className?: string;
  placeholder?: string;
  isReadOnly?: boolean;
  onValueChange?: () => void;
  size?: 'sm' | 'md';
  min?: number;
  showError?: boolean;
  shouldUnregister?: boolean;
};

const AmountInputContainer = ({
  children,
  className,
  size = 'sm',
}: {
  children?: React.ReactNode | React.ReactNode[];
  className?: string;
  size?: 'sm' | 'md';
}) => {
  return (
    <div className={cn(HEIGHT[size].base, 'relative flex w-full rounded-lg border pr-0', className)}>{children}</div>
  );
};

const AmountInputField = ({
  value,
  min,
  placeholder,
  disabled,
  onChange,
  onBlur,
}: {
  value?: string | number;
  placeholder?: string;
  disabled?: boolean;
  min?: number;
  onChange: (arg: string | number) => void;
  onBlur?: FocusEventHandler<HTMLInputElement>;
}) => {
  return (
    <InputPure
      type="number"
      className="font-code h-[28px] min-w-[40px] border-0 border-r-0 pl-2 shadow-none ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      placeholder={placeholder}
      disabled={disabled}
      value={value}
      onKeyDown={(e) => {
        if (e.key === 'e' || e.key === '-' || e.key === '+' || e.key === '.' || e.key === ',') {
          e.preventDefault();
        }
      }}
      onChange={(e) => {
        if (e.target.value === '') {
          onChange('');
          return;
        }

        const numberValue = Number(e.target.value);
        onChange(numberValue);
      }}
      min={min}
      onBlur={onBlur}
      {...AUTOCOMPLETE_PASSWORD_MANAGERS_OFF}
    />
  );
};

const AmountUnitSelect = ({
  value,
  defaultOption,
  options,
  size = 'sm',
  disabled,
  onValueChange,
}: {
  value?: string;
  defaultOption?: string;
  options: Array<{ label: string; value: string }>;
  size?: 'sm' | 'md';
  disabled?: boolean;
  onValueChange?: (val: string) => void;
}) => {
  return (
    <Select onValueChange={onValueChange} defaultValue={defaultOption} disabled={disabled} value={value}>
      <SelectTrigger
        className={cn(
          HEIGHT[size].trigger,
          'gap-1 rounded-l-none border-x-0 border-y-0 border-l bg-neutral-50 p-2 text-xs ring-0 focus:ring-0'
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        onBlur={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {options.map(({ label, value }) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const AmountInput = ({
  fields,
  options,
  defaultOption,
  className,
  placeholder,
  isReadOnly,
  onValueChange,
  size = 'sm',
  min,
  showError = true,
  shouldUnregister = false,
}: InputWithSelectProps) => {
  const { getFieldState, setValue, control } = useFormContext();

  const input = getFieldState(`${fields.inputKey}`);
  const select = getFieldState(`${fields.selectKey}`);
  const error = input.error || select.error;

  return (
    <>
      <AmountInputContainer className={className}>
        <FormField
          control={control}
          name={fields.inputKey}
          shouldUnregister={shouldUnregister}
          render={({ field }) => (
            <FormItem className="w-full overflow-hidden">
              <FormControl>
                <AmountInputField
                  placeholder={placeholder}
                  disabled={isReadOnly}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={() => {
                    onValueChange?.();
                  }}
                  min={min}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={fields.selectKey}
          shouldUnregister={shouldUnregister}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <AmountUnitSelect
                  value={field.value}
                  defaultOption={defaultOption}
                  options={options}
                  size={size}
                  disabled={isReadOnly}
                  onValueChange={(value) => {
                    setValue(fields.selectKey, value, { shouldDirty: true });
                    onValueChange?.();
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </AmountInputContainer>
      {showError && <FormMessagePure error={error ? String(error.message) : undefined} />}
    </>
  );
};

export { AmountInput, AmountInputContainer, AmountInputField, AmountUnitSelect };
