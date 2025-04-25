import { Component, createSignal } from 'solid-js';
import { useLocalization } from '../../context/LocalizationContext';
import { useStyle } from '../../helpers';
import { Button } from '../primitives/Button';
import { DatePicker, DatePickerCalendar, DatePickerHeader } from '../primitives/DatePicker';
import { TimePicker, TimeValue } from '../primitives/TimePicker';

interface SnoozeDateTimePickerProps {
  onSelect?: (date: Date) => void;
  onCancel?: () => void;
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

  return (
    <div class={style('snoozeDatePicker', 'nt-bg-white nt-rounded-md nt-shadow-lg nt-w-[320px]')}>
      <DatePicker onDateChange={(date) => setSelectedDate(date)}>
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
          class={style('snoozeDatePicker__timePickerLabel', 'nt-text-base nt-font-medium nt-text-foreground-alpha-700')}
        >
          {t('snooze.datePicker.timePickerLabel')}
        </p>
        <TimePicker value={timeValue()} onChange={setTimeValue} />
      </div>

      <div class={style('snoozeDatePicker__actions', 'nt-flex nt-flex-row nt-justify-end nt-gap-2 nt-p-2')}>
        <Button appearanceKey="snoozeDatePickerCancel__button" variant="secondary" onClick={props.onCancel}>
          {t('snooze.datePicker.cancel')}
        </Button>

        <Button appearanceKey="snoozeDatePickerApply__button" onClick={onDateTimeSelect}>
          {t('snooze.datePicker.apply')}
        </Button>
      </div>
    </div>
  );
};
