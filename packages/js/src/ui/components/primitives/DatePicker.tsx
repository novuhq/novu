import { Accessor, createContext, createSignal, JSX, splitProps, useContext } from 'solid-js';
import { useStyle } from '../../helpers';
import { cn } from '../../helpers/utils';
import { ArrowLeft } from '../../icons';
import { ArrowRight } from '../../icons/ArrowRight';
import { AppearanceKey } from '../../types';
import { Button } from './Button';

type DatePickerContextType = {
  currentDate: Accessor<Date>;
  setCurrentDate: (date: Date) => void;
  viewMonth: Accessor<Date>;
  setViewMonth: (date: Date) => void;
  selectedDate: Accessor<Date | null>;
  setSelectedDate: (date: Date | null) => void;
};

const DatePickerContext = createContext<DatePickerContextType>({
  currentDate: () => new Date(),
  setCurrentDate: () => {},
  viewMonth: () => new Date(),
  setViewMonth: () => {},
  selectedDate: () => null,
  setSelectedDate: () => {},
});

export const useDatePicker = () => useContext(DatePickerContext);

type DatePickerProps = JSX.IntrinsicElements['div'] & {
  appearanceKey?: AppearanceKey;
  value?: Date | string;
  onDateChange?: (date: Date | null) => void;
  children: JSX.Element;
};
export const DatePicker = (props: DatePickerProps) => {
  const [local, rest] = splitProps(props, ['children', 'value', 'onDateChange', 'class']);

  const style = useStyle();
  const [currentDate, setCurrentDate] = createSignal(new Date());
  const [viewMonth, setViewMonth] = createSignal(new Date());
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
      }}
    >
      <div class={style('datePicker', cn('nt-p-2', local.class))} {...rest}>
        {local.children}
      </div>
    </DatePickerContext.Provider>
  );
};

type DatePickerHeaderProps = JSX.IntrinsicElements['div'] & { appearanceKey?: AppearanceKey };
export const DatePickerHeader = (props: DatePickerHeaderProps) => {
  const [local, rest] = splitProps(props, ['class', 'appearanceKey', 'children']);
  const style = useStyle();
  const { viewMonth, setViewMonth } = useDatePicker();

  const handlePrevMonth = () => {
    const date = new Date(viewMonth());
    date.setMonth(date.getMonth() - 1);
    setViewMonth(date);
  };

  const handleNextMonth = () => {
    const date = new Date(viewMonth());
    date.setMonth(date.getMonth() + 1);
    setViewMonth(date);
  };

  return (
    <div
      class={style(
        local.appearanceKey || 'datePickerControl',
        cn(
          'nt-flex nt-items-center nt-justify-between nt-gap-1.5 nt-h-7 nt-p-1 nt-mb-2 nt-rounded-lg nt-bg-neutral-50',
          local.class
        )
      )}
      {...rest}
    >
      <Button
        appearanceKey="datePickerControlPrevTrigger"
        variant="ghost"
        onClick={handlePrevMonth}
        class="nt-flex nt-justify-center nt-items-center nt-gap-0.5 nt-w-5 nt-h-5 nt-p-0 nt-rounded-md nt-bg-white nt-shadow-[0px_1px_2px_0px_rgba(10,13,20,0.03)]"
      >
        <ArrowLeft class={style('datePickerControlPrevTrigger__icon', 'nt-size-4 nt-text-foreground-alpha-700')} />
      </Button>
      <span class={style('datePickerHeaderMonth', 'nt-text-sm nt-font-medium nt-text-foreground-alpha-700')}>
        {viewMonth().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </span>
      <Button
        appearanceKey="datePickerControlNextTrigger"
        variant="ghost"
        onClick={handleNextMonth}
        class="nt-flex nt-justify-center nt-items-center nt-gap-0.5 nt-w-5 nt-h-5 nt-p-0 nt-rounded-md nt-bg-white nt-shadow-[0px_1px_2px_0px_rgba(10,13,20,0.03)]"
      >
        <ArrowRight class={style('datePickerControlNextTrigger__icon', 'nt-size-4 nt-text-foreground-alpha-700')} />
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
      class={style(local.appearanceKey || 'datePickerGrid', cn('nt-w-full nt-grid nt-gap-1', local.class))}
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
      class={style(
        local.appearanceKey || 'datePickerGridRow',
        cn('nt-grid nt-grid-cols-7 nt-gap-1 nt-w-full', local.class)
      )}
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
      class={style(
        local.appearanceKey || 'datePickerGridHeader',
        cn('nt-text-muted-foreground nt-text-[0.8rem] nt-font-normal nt-text-center', local.class)
      )}
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
      class={style(
        local.appearanceKey || 'datePickerGridCell',
        cn(
          'nt-p-0 nt-text-center nt-text-sm',
          'nt-has-[[data-in-range]]:bg-accent nt-has-[[data-in-range]]:first-of-type:rounded-l-md nt-has-[[data-in-range]]:last-of-type:rounded-r-md',
          'nt-has-[[data-range-end]]:rounded-r-md nt-has-[[data-range-start]]:rounded-l-md',
          'nt-has-[[data-outside-range][data-in-range]]:bg-accent/50',
          local.class
        )
      )}
      {...rest}
    />
  );
};

type DatePickerGridCellTriggerProps = JSX.IntrinsicElements['button'] & { appearanceKey?: AppearanceKey; date: Date };
export const DatePickerGridCellTrigger = (props: DatePickerGridCellTriggerProps) => {
  const [local, rest] = splitProps(props, ['class', 'appearanceKey', 'date']);
  const { selectedDate, viewMonth, setSelectedDate } = useDatePicker();

  const isCurrentMonth = props.date.getMonth() === viewMonth().getMonth();

  return (
    <Button
      appearanceKey="datePickerCalendarDay__button"
      variant="ghost"
      disabled={!isCurrentMonth}
      onClick={() => setSelectedDate(local.date)}
      class={cn(
        'nt-size-8 nt-w-full nt-rounded-md nt-flex nt-items-center nt-justify-center',
        {
          'nt-text-muted-foreground disabled:nt-opacity-20': !isCurrentMonth,
          'nt-text-foreground-alpha-700': isCurrentMonth,
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
};

// Full DatePicker with all components
export const DatePickerWithContext = ({ onDateChange }: { onDateChange?: (date: Date | null) => void }) => {
  return (
    <DatePicker onDateChange={onDateChange}>
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

  // Generate days for the current month view
  const getDaysInMonth = () => {
    const year = viewMonth().getFullYear();
    const month = viewMonth().getMonth();

    // Get first day of the month
    const firstDay = new Date(year, month, 1);
    // Get days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Get the day of the week the first day falls on (0-6, Sunday-Saturday)
    const startingDay = firstDay.getDay();

    // Generate array of date objects for the month
    const days: Date[] = [];

    // Add previous month's days to fill the first row
    for (let i = 0; i < startingDay; i += 1) {
      const prevMonthDay = new Date(year, month, -i);
      days.unshift(prevMonthDay);
    }

    // Add days of the current month
    for (let i = 1; i <= daysInMonth; i += 1) {
      days.push(new Date(year, month, i));
    }

    // Add days to complete the last row if needed
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
      class={style(local.appearanceKey || 'datePickerCalendar', cn('nt-grid nt-grid-cols-7 nt-gap-1', local.class))}
      {...rest}
    >
      {getDaysInMonth().map((date) => {
        return <DatePickerGridCellTrigger date={date} />;
      })}
    </div>
  );
};
