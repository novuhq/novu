import { Accessor, createContext, createSignal, JSX, splitProps, useContext } from 'solid-js';
import { useLocalization } from '../../context/LocalizationContext';
import { useStyle } from '../../helpers';
import { cn } from '../../helpers/utils';
import { ArrowLeft as DefaultArrowLeft } from '../../icons';
import { ArrowRight as DefaultArrowRight } from '../../icons/ArrowRight';
import { AppearanceKey } from '../../types';
import { IconRendererWrapper } from '../shared/IconRendererWrapper';
import { Button } from './Button';
import { Tooltip } from './Tooltip';

type DatePickerContextType = {
  currentDate: Accessor<Date>;
  setCurrentDate: (date: Date) => void;
  viewMonth: Accessor<Date>;
  setViewMonth: (date: Date) => void;
  selectedDate: Accessor<Date | null>;
  setSelectedDate: (date: Date | null) => void;
  maxDays: Accessor<number>;
};

const DatePickerContext = createContext<DatePickerContextType>({
  currentDate: () => new Date(),
  setCurrentDate: () => {},
  viewMonth: () => new Date(),
  setViewMonth: () => {},
  selectedDate: () => null,
  setSelectedDate: () => {},
  maxDays: () => 0,
});

export const useDatePicker = () => useContext(DatePickerContext);

type DatePickerProps = JSX.IntrinsicElements['div'] & {
  appearanceKey?: AppearanceKey;
  value?: Date | string;
  onDateChange?: (date: Date | null) => void;
  maxDays: number;
  children: JSX.Element;
};
export const DatePicker = (props: DatePickerProps) => {
  const [local, rest] = splitProps(props, ['children', 'value', 'onDateChange', 'class', 'maxDays']);

  const style = useStyle();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [currentDate, setCurrentDate] = createSignal(today);
  const [viewMonth, setViewMonth] = createSignal(today);
  const [selectedDate, setSelectedDate] = createSignal(local.value ? new Date(local.value) : null);

  const handleDateSelect = (date: Date | null) => {
    setSelectedDate(date);
    if (local.onDateChange) {
      local.onDateChange(date);
    }
  };

  return (
    <DatePickerContext.Provider
      value={{
        currentDate,
        setCurrentDate,
        viewMonth,
        setViewMonth,
        selectedDate,
        setSelectedDate: handleDateSelect,
        maxDays: () => props.maxDays,
      }}
    >
      <div class={style({ key: 'datePicker', className: cn('nt-p-2', local.class) })} {...rest}>
        {local.children}
      </div>
    </DatePickerContext.Provider>
  );
};

type DatePickerHeaderProps = JSX.IntrinsicElements['div'] & { appearanceKey?: AppearanceKey };
export const DatePickerHeader = (props: DatePickerHeaderProps) => {
  const [local, rest] = splitProps(props, ['class', 'appearanceKey', 'children']);
  const style = useStyle();
  const { viewMonth, setViewMonth, currentDate, maxDays } = useDatePicker();

  const prevIconClass = style({
    key: 'datePickerControlPrevTrigger__icon',
    className: 'nt-size-4 nt-text-foreground-alpha-700',
    iconKey: 'arrowLeft',
  });

  const nextIconClass = style({
    key: 'datePickerControlNextTrigger__icon',
    className: 'nt-size-4 nt-text-foreground-alpha-700',
    iconKey: 'arrowRight',
  });

  const handlePrevMonth = () => {
    const date = new Date(viewMonth());
    date.setMonth(date.getMonth() - 1);

    // Don't allow navigating to months before the current month
    const currentMonth = currentDate();
    if (
      date.getFullYear() < currentMonth.getFullYear() ||
      (date.getFullYear() === currentMonth.getFullYear() && date.getMonth() < currentMonth.getMonth())
    ) {
      return;
    }

    setViewMonth(date);
  };

  const handleNextMonth = () => {
    const date = new Date(viewMonth());
    date.setMonth(date.getMonth() + 1);

    const maxDaysValue = maxDays();
    if (maxDaysValue > 0) {
      const maxDate = new Date(currentDate());
      maxDate.setDate(maxDate.getDate() + maxDaysValue);

      if (
        date.getFullYear() > maxDate.getFullYear() ||
        (date.getFullYear() === maxDate.getFullYear() && date.getMonth() > maxDate.getMonth())
      ) {
        return;
      }
    }

    setViewMonth(date);
  };

  const isPrevDisabled = () => {
    const current = currentDate();
    const view = viewMonth();

    return view.getFullYear() === current.getFullYear() && view.getMonth() === current.getMonth();
  };

  const isNextDisabled = () => {
    const maxDaysValue = maxDays();
    if (maxDaysValue === 0) return false;

    const view = viewMonth();

    const maxDate = new Date(currentDate());
    maxDate.setDate(maxDate.getDate() + maxDaysValue);

    return view.getFullYear() === maxDate.getFullYear() && view.getMonth() === maxDate.getMonth();
  };

  return (
    <div
      class={style({
        key: local.appearanceKey || 'datePickerControl',
        className: cn(
          'nt-flex nt-items-center nt-justify-between nt-gap-1.5 nt-h-7 nt-p-1 nt-mb-2 nt-rounded-lg nt-bg-background',
          local.class
        ),
      })}
      {...rest}
    >
      <Button
        appearanceKey="datePickerControlPrevTrigger"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          handlePrevMonth();
        }}
        disabled={isPrevDisabled()}
        class="nt-flex nt-justify-center nt-items-center nt-gap-0.5 nt-w-5 nt-h-5 nt-p-0 nt-rounded-md nt-bg-background nt-shadow-[0px_1px_2px_0px_rgba(10,13,20,0.03)]"
      >
        <IconRendererWrapper
          iconKey="arrowLeft"
          class={prevIconClass}
          fallback={<DefaultArrowLeft class={prevIconClass} />}
        />
      </Button>
      <span
        class={style({
          key: 'datePickerHeaderMonth',
          className: 'nt-text-sm nt-font-medium nt-text-foreground-alpha-700',
        })}
      >
        {viewMonth().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </span>
      <Button
        appearanceKey="datePickerControlNextTrigger"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          handleNextMonth();
        }}
        disabled={isNextDisabled()}
        class="nt-flex nt-justify-center nt-items-center nt-gap-0.5 nt-w-5 nt-h-5 nt-p-0 nt-rounded-md nt-bg-background nt-shadow-[0px_1px_2px_0px_rgba(10,13,20,0.03)]"
      >
        <IconRendererWrapper
          iconKey="arrowRight"
          class={nextIconClass}
          fallback={<DefaultArrowRight class={nextIconClass} />}
        />
      </Button>
    </div>
  );
};

type DatePickerGridProps = JSX.IntrinsicElements['div'] & { appearanceKey?: AppearanceKey };
export const DatePickerGrid = (props: DatePickerGridProps) => {
  const [local, rest] = splitProps(props, ['class', 'appearanceKey']);
  const style = useStyle();

  return (
    <div
      class={style({
        key: local.appearanceKey || 'datePickerGrid',
        className: cn('nt-w-full nt-grid nt-gap-1', local.class),
      })}
      {...rest}
    />
  );
};

type DatePickerGridRowProps = JSX.IntrinsicElements['div'] & { appearanceKey?: AppearanceKey };
export const DatePickerGridRow = (props: DatePickerGridRowProps) => {
  const [local, rest] = splitProps(props, ['class', 'appearanceKey']);
  const style = useStyle();

  return (
    <div
      class={style({
        key: local.appearanceKey || 'datePickerGridRow',
        className: cn('nt-grid nt-grid-cols-7 nt-gap-1 nt-w-full', local.class),
      })}
      {...rest}
    />
  );
};

type DatePickerGridHeaderProps = JSX.IntrinsicElements['div'] & { appearanceKey?: AppearanceKey };
export const DatePickerGridHeader = (props: DatePickerGridHeaderProps) => {
  const [local, rest] = splitProps(props, ['class', 'appearanceKey']);
  const style = useStyle();

  return (
    <div
      class={style({
        key: local.appearanceKey || 'datePickerGridHeader',
        className: cn('nt-text-muted-foreground nt-text-[0.8rem] nt-font-normal nt-text-center', local.class),
      })}
      {...rest}
    />
  );
};

type DatePickerGridCellProps = JSX.IntrinsicElements['div'] & { appearanceKey?: AppearanceKey };
export const DatePickerGridCell = (props: DatePickerGridCellProps) => {
  const [local, rest] = splitProps(props, ['class', 'appearanceKey']);
  const style = useStyle();

  return (
    <div
      class={style({
        key: local.appearanceKey || 'datePickerGridCell',
        className: cn(
          'nt-p-0 nt-text-center nt-text-sm',
          'nt-has-[[data-in-range]]:bg-accent nt-has-[[data-in-range]]:first-of-type:rounded-l-md nt-has-[[data-in-range]]:last-of-type:rounded-r-md',
          'nt-has-[[data-range-end]]:rounded-r-md nt-has-[[data-range-start]]:rounded-l-md',
          'nt-has-[[data-outside-range][data-in-range]]:bg-accent/50',
          local.class
        ),
      })}
      {...rest}
    />
  );
};

type DatePickerGridCellTriggerProps = JSX.IntrinsicElements['button'] & { appearanceKey?: AppearanceKey; date: Date };
export const DatePickerGridCellTrigger = (props: DatePickerGridCellTriggerProps) => {
  const [local, rest] = splitProps(props, ['class', 'appearanceKey', 'date']);
  const { selectedDate, viewMonth, setSelectedDate, currentDate, maxDays } = useDatePicker();
  const { t } = useLocalization();

  const isCurrentMonth = props.date.getMonth() === viewMonth().getMonth();

  const isPastDate = () => {
    const today = currentDate();

    return props.date < today;
  };

  const isFutureDate = () => {
    const maxDaysValue = maxDays();
    if (maxDaysValue === 0) return false;

    const maxDate = new Date(currentDate());
    maxDate.setDate(maxDate.getDate() + maxDaysValue);

    return props.date > maxDate;
  };

  const isDisabled = !isCurrentMonth || isPastDate() || isFutureDate();

  const isExceedingLimit = () => {
    return isCurrentMonth && isFutureDate();
  };

  const buttonElement = (
    <Button
      appearanceKey="datePickerCalendarDay__button"
      variant="ghost"
      disabled={isDisabled}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedDate(local.date);
      }}
      class={cn(
        'nt-size-8 nt-w-full nt-rounded-md nt-flex nt-items-center nt-justify-center',
        {
          'nt-text-muted-foreground disabled:nt-opacity-20': !isCurrentMonth || isPastDate(),
          'nt-text-foreground-alpha-700': isCurrentMonth && !isPastDate() && !isFutureDate(),
        },
        {
          'nt-bg-primary-alpha-300 hover:nt-bg-primary-alpha-400':
            selectedDate()?.toDateString() === local.date.toDateString(),
        }
      )}
      {...rest}
    >
      {local.date.getDate()}
    </Button>
  );

  if (isExceedingLimit()) {
    return (
      <Tooltip.Root>
        <Tooltip.Trigger>{buttonElement}</Tooltip.Trigger>
        <Tooltip.Content>{t('snooze.datePicker.exceedingLimitTooltip', { days: maxDays() })}</Tooltip.Content>
      </Tooltip.Root>
    );
  }

  return buttonElement;
};

export const DatePickerWithContext = ({
  onDateChange,
  maxDays,
}: {
  onDateChange?: (date: Date | null) => void;
  maxDays: number;
}) => {
  return (
    <DatePicker onDateChange={onDateChange} maxDays={maxDays}>
      <DatePickerHeader />
      <DatePickerCalendar />
    </DatePicker>
  );
};

type DatePickerCalendarProps = JSX.IntrinsicElements['div'] & {
  appearanceKey?: AppearanceKey;
};
export const DatePickerCalendar = (props: DatePickerCalendarProps) => {
  const [local, rest] = splitProps(props, ['class', 'appearanceKey']);
  const style = useStyle();
  const { viewMonth } = useDatePicker();

  const getDaysInMonth = () => {
    const year = viewMonth().getFullYear();
    const month = viewMonth().getMonth();

    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const startingDay = firstDay.getDay();

    const days: Date[] = [];

    for (let i = 0; i < startingDay; i += 1) {
      const prevMonthDay = new Date(year, month, -i);
      days.unshift(prevMonthDay);
    }

    for (let i = 1; i <= daysInMonth; i += 1) {
      days.push(new Date(year, month, i));
    }

    const remainingCells = 7 - (days.length % 7);
    if (remainingCells < 7) {
      for (let i = 1; i <= remainingCells; i += 1) {
        days.push(new Date(year, month + 1, i));
      }
    }

    return days;
  };

  return (
    <div
      class={style({
        key: local.appearanceKey || 'datePickerCalendar',
        className: cn('nt-grid nt-grid-cols-7 nt-gap-1', local.class),
      })}
      onClick={(e) => e.stopPropagation()}
      {...rest}
    >
      {getDaysInMonth().map((date) => {
        return <DatePickerGridCellTrigger date={date} />;
      })}
    </div>
  );
};
