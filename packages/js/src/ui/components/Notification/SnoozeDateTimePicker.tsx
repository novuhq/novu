import { Component, createSignal } from 'solid-js';
import { useLocalization } from '../../context/LocalizationContext';
import { useStyle } from '../../helpers';
import { Button } from '../primitives/Button';
import { DatePicker, DatePickerCalendar, DatePickerHeader } from '../primitives/DatePicker';
import { TimePicker, TimeValue } from '../primitives/TimePicker';

interface SnoozeDateTimePickerProps {
  onSelect?: (date: Date) => void;
  onCancel?: () => void;
  maxDurationHours?: number;
}

export const SnoozeDateTimePicker: Component<SnoozeDateTimePickerProps> = (props) => {
  const style = useStyle();
  const { t } = useLocalization();
  const [selectedDate, setSelectedDate] = createSignal<Date | null>(null);
  const [timeValue, setTimeValue] = createSignal<TimeValue>({ hour: 12, minute: 0, isPM: true });

  const onDateTimeSelect = () => {
    if (selectedDate() && timeValue()) {
      const date = new Date(selectedDate()!);
      props.onSelect?.(new Date(date.setHours(timeValue().hour, timeValue().minute, 0, 0)));
    }
  };
  const maxDays = () => {
    if (!props.maxDurationHours) return undefined;

    // Convert hours to days, rounding up to ensure we have enough days
    return Math.ceil(props.maxDurationHours / 24);
  };

  const isDateTimeExceedingLimit = () => {
    if (!selectedDate() || !timeValue() || !props.maxDurationHours) {
      return false;
    }

    const now = new Date();
    const date = new Date(selectedDate()!);
    const selectedDateTime = new Date(
      date.setHours(timeValue().isPM ? timeValue().hour + 12 : timeValue().hour, timeValue().minute, 0, 0)
    );

    const maxDateTime = new Date(now.getTime() + props.maxDurationHours * 60 * 60 * 1000);

    return selectedDateTime > maxDateTime;
  };

  return (
    <div class={style('snoozeDatePicker', 'nt-bg-white nt-rounded-md nt-shadow-lg nt-w-[260px]')}>
      <DatePicker onDateChange={(date) => setSelectedDate(date)} maxDays={maxDays()}>
        <DatePickerHeader />

        <DatePickerCalendar />
      </DatePicker>

      <div
        class={style(
          'snoozeDatePicker__timePickerContainer',
          'nt-flex nt-flex-row nt-justify-between nt-p-2 nt-items-center nt-border-t nt-border-neutral-200 nt-border-b'
        )}
      >
        <p
          class={style(
            'snoozeDatePicker__timePickerLabel',
            'nt-text-sm nt-font-medium nt-text-foreground-alpha-700 nt-p-2'
          )}
        >
          {t('snooze.datePicker.timePickerLabel')}
        </p>
        <TimePicker value={timeValue()} onChange={setTimeValue} />
      </div>

      <div class={style('snoozeDatePicker__actions', 'nt-flex nt-flex-row nt-justify-end nt-gap-2 nt-p-2')}>
        <Button
          appearanceKey="snoozeDatePickerCancel__button"
          variant="secondary"
          class="nt-h-7 nt-w-[60px] nt-px-2"
          onClick={props.onCancel}
        >
          {t('snooze.datePicker.cancel')}
        </Button>

        <Button
          appearanceKey="snoozeDatePickerApply__button"
          class="nt-h-7 nt-w-[60px] nt-px-2"
          onClick={onDateTimeSelect}
          disabled={!selectedDate() || isDateTimeExceedingLimit()}
        >
          {t('snooze.datePicker.apply')}
        </Button>
      </div>
    </div>
  );
};
