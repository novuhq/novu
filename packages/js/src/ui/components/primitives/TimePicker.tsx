import { Component, createSignal, splitProps } from 'solid-js';
import { useStyle } from '../../helpers';
import { cn } from '../../helpers/utils';
import { AppearanceKey } from '../../types';
import { Input, inputVariants } from './Input';

export interface TimeValue {
  hour: number;
  minute: number;
  isPM: boolean;
}

interface TimePickerProps {
  value?: TimeValue;
  onChange?: (value: TimeValue) => void;
  class?: string;
  appearanceKey?: AppearanceKey;
}

export const TimePicker: Component<TimePickerProps> = (props) => {
  const [local, rest] = splitProps(props, ['value', 'onChange', 'class', 'appearanceKey']);
  const style = useStyle();

  const initialValue = local.value || { hour: 12, minute: 0, isPM: true };
  const [hour, setHour] = createSignal(initialValue.hour);
  const [minute, setMinute] = createSignal(initialValue.minute);
  const [isPM, setIsPM] = createSignal(initialValue.isPM);

  const notifyChange = () => {
    if (local.onChange) {
      local.onChange({
        hour: hour(),
        minute: minute(),
        isPM: isPM(),
      });
    }
  };

  const handleHourChange = (newHour: number) => {
    setHour(newHour);
    notifyChange();
  };

  const handleMinuteChange = (newMinute: number) => {
    setMinute(newMinute);
    notifyChange();
  };

  const handlePeriodChange = (newIsPM: boolean) => {
    setIsPM(newIsPM);
    notifyChange();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // Allow only: digits, arrows, backspace, delete, tab
    const allowedKeys = [
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Backspace',
      'Delete',
      'Tab',
    ];
    if (!allowedKeys.includes(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <div
      class={style({
        key: local.appearanceKey || 'timePicker',
        className: cn('nt-flex nt-items-center nt-gap-1', local.class),
      })}
      onClick={(e) => e.stopPropagation()}
      {...rest}
    >
      <Input
        size="sm"
        type="number"
        min="1"
        max="12"
        onKeyDown={(e) => {
          e.stopPropagation();
          handleKeyDown(e);
        }}
        value={hour().toString()}
        onInput={(e) => {
          e.stopPropagation();
          enforceMinMax(e.currentTarget);
          handleHourChange(Number(e.currentTarget.value));
        }}
        class={style({
          key: 'timePickerHour__input',
          className:
            'nt-flex nt-font-mono nt-justify-center nt-items-center nt-text-center nt-h-7 nt-w-[calc(2ch+2rem)] nt-px-2',
        })}
      />

      <span class={style({ key: 'timePicker__separator', className: 'nt-text-xl' })}>:</span>

      <Input
        size="sm"
        type="number"
        min="0"
        max="59"
        onKeyDown={(e) => {
          e.stopPropagation();
          handleKeyDown(e);
        }}
        value={minute().toString().padStart(2, '0')}
        onInput={(e) => {
          e.stopPropagation();
          enforceMinMax(e.currentTarget);
          handleMinuteChange(Number(e.currentTarget.value));
        }}
        class={style({
          key: 'timePickerHour__input',
          className:
            'nt-flex nt-font-mono nt-justify-center nt-items-center nt-text-center nt-h-7 nt-w-[calc(2ch+2rem)] nt-px-2',
        })}
      />

      <select
        class={style({
          key: 'timePicker__periodSelect',
          className: cn(inputVariants({ size: 'sm' }), 'nt-h-7 nt-font-mono'),
        })}
        value={isPM() ? 'PM' : 'AM'}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          e.stopPropagation();
          handlePeriodChange(e.target.value === 'PM');
        }}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
};

const enforceMinMax = (el: HTMLInputElement) => {
  if (el.value !== '') {
    const value = parseInt(el.value, 10);
    const min = parseInt(el.min, 10);
    const max = parseInt(el.max, 10);

    if (value < min || value > max) {
      // Reject the extra digit by reverting to the previous valid value
      el.value = el.value.slice(0, -1);

      // If still invalid after removing the last digit, set to min/max
      const newValue = parseInt(el.value, 10);
      if (Number.isNaN(newValue) || newValue < min) {
        el.value = el.min;
      } else if (newValue > max) {
        el.value = el.max;
      }
    }
  }
};
