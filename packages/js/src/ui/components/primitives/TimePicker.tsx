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

  const handleTimeChange = (type: 'hour' | 'minute' | 'period', value: string | number) => {
    const newValue: TimeValue = {
      hour: hour(),
      minute: minute(),
      isPM: isPM(),
    };

    if (type === 'hour') {
      const hourValue = Math.min(12, Math.max(1, Number(value) || 1));
      setHour(hourValue);
      newValue.hour = hourValue;
    } else if (type === 'minute') {
      const minuteValue = Math.min(59, Math.max(0, Number(value) || 0));
      setMinute(minuteValue);
      newValue.minute = minuteValue;
    } else if (type === 'period') {
      const isPmValue = value === 'PM';
      setIsPM(isPmValue);
      newValue.isPM = isPmValue;
    }

    local.onChange?.(newValue);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // Only allow numbers, backspace, delete, arrow keys, and tab
    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
    if (!allowedKeys.includes(e.key) && !/[0-9]/.test(e.key)) {
      e.preventDefault();
    }
  };

  const toDate = (value: TimeValue): Date => {
    const date = new Date();
    let hours = value.hour;

    // Convert to 24-hour format
    if (value.isPM && hours !== 12) {
      hours += 12;
    } else if (!value.isPM && hours === 12) {
      hours = 0;
    }

    date.setHours(hours, value.minute, 0, 0);

    return date;
  };

  return (
    <div
      class={style(local.appearanceKey || 'timePicker', cn('nt-flex nt-items-center nt-gap-1', local.class))}
      {...rest}
    >
      <Input
        size="sm"
        type="number"
        min="1"
        max="12"
        value={hour()}
        onKeyDown={handleKeyDown}
        onChange={(e) => handleTimeChange('hour', e.currentTarget.value)}
        class={style(
          'timePickerHour__input',
          'nt-flex nt-font-mono nt-justify-center nt-items-center nt-text-center nt-h-7 nt-w-[calc(2ch+2rem)] nt-px-2'
        )}
      />

      <span class={style('timePicker__separator', 'nt-text-xl')}>:</span>

      <Input
        size="sm"
        type="number"
        min="0"
        max="59"
        value={minute().toString().padStart(2, '0')}
        onChange={(e) => handleTimeChange('minute', e.currentTarget.value)}
        onKeyDown={handleKeyDown}
        class={style(
          'timePickerHour__input',
          'nt-flex nt-font-mono nt-justify-center nt-items-center nt-text-center nt-h-7 nt-w-[calc(2ch+2rem)] nt-px-2'
        )}
      />

      <select
        class={style('timePicker__periodSelect', `${inputVariants({ size: 'sm' })} nt-h-7 nt-font-mono`)}
        value={isPM() ? 'PM' : 'AM'}
        onChange={(e) => handleTimeChange('period', e.target.value)}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
};

// Helper to convert TimeValue to 24-hour string format (HH:MM)
export const timeValueToString = (value: TimeValue): string => {
  let hours = value.hour;

  // Convert to 24-hour format
  if (value.isPM && hours !== 12) {
    hours += 12;
  } else if (!value.isPM && hours === 12) {
    hours = 0;
  }

  return `${hours.toString().padStart(2, '0')}:${value.minute.toString().padStart(2, '0')}`;
};

// Helper to convert Date object to TimeValue
export const dateToTimeValue = (date: Date): TimeValue => {
  const hours24 = date.getHours();
  const isPM = hours24 >= 12;
  let hour = hours24 % 12;

  if (hour === 0) {
    hour = 12;
  }

  return {
    hour,
    minute: date.getMinutes(),
    isPM,
  };
};
