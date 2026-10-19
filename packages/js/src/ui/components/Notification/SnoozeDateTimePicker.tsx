import { Component, createEffect, createMemo, createSignal, onCleanup, Show } from 'solid-js';
import { useLocalization } from '../../context/LocalizationContext';
import { useStyle } from '../../helpers';
import { Button } from '../primitives/Button';
import { DatePicker, DatePickerCalendar, DatePickerHeader } from '../primitives/DatePicker';
import { TimePicker, TimeValue } from '../primitives/TimePicker';
import { Tooltip } from '../primitives/Tooltip';

const fiveMinutesFromNow = () => {
  const futureTime = new Date(Date.now() + 5 * 60 * 1000);
  const hours = futureTime.getHours();
  const isPM = hours >= 12;

  let hour;
  if (hours === 0) {
    hour = 12; // 12 AM
  } else if (hours === 12) {
    hour = 12; // 12 PM
  } else {
    hour = hours % 12; // 1-11 AM/PM
  }

  return {
    hour,
    minute: futureTime.getMinutes(),
    isPM,
  };
};

/**
 * Converts a 12-hour format time to 24-hour hours value
 * Correctly handles the special case of 12 AM/PM:
 * - 12:00 AM = 00:00 (midnight)
 * - 12:00 PM = 12:00 (noon)
 */
const convertTo24Hour = (time: TimeValue): number => {
  if (time.isPM) {
    return time.hour === 12 ? 12 : time.hour + 12;
  } else {
    return time.hour === 12 ? 0 : time.hour;
  }
};

const REFRESH_INTERVAL = 5_000;

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
  const [currentTime, setCurrentTime] = createSignal(new Date());

  // Update current time every N seconds to ensure validation remains accurate
  createEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, REFRESH_INTERVAL);

    onCleanup(() => clearInterval(interval));
  });

  const onDateTimeSelect = () => {
    if (selectedDate() && timeValue()) {
      const date = new Date(selectedDate()!);
      const hours = convertTo24Hour(timeValue());

      date.setHours(hours, timeValue().minute, 0, 0);
      props.onSelect?.(date);
    }
  };

  const maxDays = () => {
    if (!props.maxDurationHours) return 0;

    return Math.ceil(props.maxDurationHours / 24);
  };

  const getSelectedDateTime = (): Date | null => {
    if (!selectedDate() || !timeValue()) return null;

    const date = new Date(selectedDate()!);
    const hours = convertTo24Hour(timeValue());
    date.setHours(hours, timeValue().minute, 0, 0);

    return date;
  };

  const isTimeInPast = createMemo(() => {
    const dateTime = getSelectedDateTime();
    if (!dateTime) return false;

    // The time must be at least 3 minutes in the future
    const minAllowedDateTime = new Date(currentTime().getTime() + 3 * 60 * 1000);

    return dateTime < minAllowedDateTime;
  });

  const isTimeExceedingMaxDuration = createMemo(() => {
    const dateTime = getSelectedDateTime();
    if (!dateTime || !props.maxDurationHours) return false;

    const maxAllowedDateTime = new Date(currentTime().getTime() + props.maxDurationHours * 60 * 60 * 1000);

    return dateTime > maxAllowedDateTime;
  });

  const applyButtonEnabled = createMemo(() => {
    if (!selectedDate() || !timeValue()) {
      return false;
    }

    // Check if the date is in the future (at least 3 minutes)
    if (isTimeInPast()) {
      return false;
    }

    // Check if date exceeds max duration (if set)
    if (props.maxDurationHours && isTimeExceedingMaxDuration()) {
      return false;
    }

    return true;
  });

  const getTooltipMessage = createMemo(() => {
    if (isTimeInPast()) {
      return t('snooze.datePicker.pastDateTooltip');
    }

    if (isTimeExceedingMaxDuration()) {
      return t('snooze.datePicker.exceedingLimitTooltip', { days: maxDays() });
    }

    return t('snooze.datePicker.noDateSelectedTooltip');
  });

  return (
    <div
      class={style({
        key: 'snoozeDatePicker',
        className: 'nt-bg-background nt-rounded-md nt-shadow-lg nt-w-[260px]',
      })}
      onClick={(e) => e.stopPropagation()}
    >
      <DatePicker onDateChange={(date) => setSelectedDate(date)} maxDays={maxDays()}>
        <DatePickerHeader />

        <DatePickerCalendar />
      </DatePicker>

      <div
        class={style({
          key: 'snoozeDatePicker__timePickerContainer',
          className:
            'nt-flex nt-flex-row nt-justify-between nt-p-2 nt-items-center nt-border-t nt-border-neutral-200 nt-border-b',
        })}
      >
        <p
          class={style({
            key: 'snoozeDatePicker__timePickerLabel',
            className: 'nt-text-sm nt-font-medium nt-text-foreground-alpha-700 nt-p-2',
          })}
        >
          {t('snooze.datePicker.timePickerLabel')}
        </p>
        <TimePicker value={timeValue()} onChange={setTimeValue} />
      </div>

      <div
        class={style({
          key: 'snoozeDatePicker__actions',
          className: 'nt-flex nt-flex-row nt-justify-end nt-gap-2 nt-p-2',
        })}
      >
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
              <Tooltip.Content>{getTooltipMessage()}</Tooltip.Content>
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
