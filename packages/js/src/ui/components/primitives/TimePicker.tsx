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
        value={hour().toString()}
        onInput={(e) => {
          enforceMinMax(e.currentTarget);
          setHour(Number(e.currentTarget.value));
        }}
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
        value={minute().toString()}
        onInput={(e) => {
          enforceMinMax(e.currentTarget);
          setMinute(Number(e.currentTarget.value));
        }}
        class={style(
          'timePickerHour__input',
          'nt-flex nt-font-mono nt-justify-center nt-items-center nt-text-center nt-h-7 nt-w-[calc(2ch+2rem)] nt-px-2'
        )}
      />

      <select
        class={style('timePicker__periodSelect', `${inputVariants({ size: 'sm' })} nt-h-7 nt-font-mono`)}
        value={isPM() ? 'PM' : 'AM'}
        onChange={(e) => {
          setIsPM(e.target.value === 'PM');
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
      // eslint-disable-next-line no-param-reassign
      el.value = el.value.slice(0, -1);

      // If still invalid after removing the last digit, set to min/max
      const newValue = parseInt(el.value, 10);
      if (Number.isNaN(newValue) || newValue < min) {
        // eslint-disable-next-line no-param-reassign
        el.value = el.min;
      } else if (newValue > max) {
        // eslint-disable-next-line no-param-reassign
        el.value = el.max;
      }
    }
  }
};
