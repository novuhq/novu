import { Component, createMemo, createSignal, Show } from 'solid-js';
import { useLocalization } from '../../context/LocalizationContext';
import { useStyle } from '../../helpers';
import { Button } from '../primitives/Button';
import { DatePicker, DatePickerCalendar, DatePickerHeader } from '../primitives/DatePicker';
import { TimePicker, TimeValue } from '../primitives/TimePicker';
import { Tooltip } from '../primitives/Tooltip';

const fiveMinutesFromNow = () => {
  const now = new Date();
  const futureTime = new Date(now.getTime() + 5 * 60 * 1000); // current time + 5 minutes
  const hours = futureTime.getHours();
  const isPM = hours >= 12;
  const hour = isPM ? hours - 12 : hours;

  return {
    hour,
    minute: futureTime.getMinutes(),
    isPM,
  };
};

interface SnoozeDateTimePickerProps {
  onSelect?: (date: Date) => void;
  onCancel?: () => void;
  maxDurationHours?: number;
}

export const SnoozeDateTimePicker: Component<SnoozeDateTimePickerProps> = (props) => {
  const style = useStyle();
  const { t } = useLocalization();
  const [selectedDate, setSelectedDate] = createSignal<Date | null>(null);
  const [timeValue, setTimeValue] = createSignal<TimeValue>(fiveMinutesFromNow());

  const onDateTimeSelect = () => {
    if (selectedDate() && timeValue()) {
      const date = new Date(selectedDate()!);
      props.onSelect?.(new Date(date.setHours(timeValue().hour, timeValue().minute, 0, 0)));
    }
  };
  const maxDays = () => {
    if (!props.maxDurationHours) return undefined;

    return Math.ceil(props.maxDurationHours / 24);
  };

  const applyButtonEnabled = createMemo(() => {
    if (!selectedDate() || !timeValue()) {
      return false;
    }

    if (!props.maxDurationHours) {
      return true;
    }

    return selectedDate() && !isDateTimeExceedingLimit();
  });

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

    // Check if the selected date is in the past or exceeds the maximum allowed duration
    return selectedDateTime > maxDateTime || selectedDateTime < now;
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

        <Show
          when={applyButtonEnabled()}
          fallback={
            <Tooltip.Root>
              <Tooltip.Trigger
                asChild={(props) => (
                  <Button
                    appearanceKey="snoozeDatePickerApply__button"
                    class="nt-h-7 nt-w-[60px] nt-px-2 !nt-pointer-events-auto"
                    onClick={onDateTimeSelect}
                    disabled={true}
                    {...props}
                  >
                    {t('snooze.datePicker.apply')}
                  </Button>
                )}
              />
              <Tooltip.Content>{t('snooze.datePicker.applyTooltip')}</Tooltip.Content>
            </Tooltip.Root>
          }
        >
          <Button
            appearanceKey="snoozeDatePickerApply__button"
            class="nt-h-7 nt-w-[60px] nt-px-2"
            onClick={onDateTimeSelect}
          >
            {t('snooze.datePicker.apply')}
          </Button>
        </Show>
      </div>
    </div>
  );
};
