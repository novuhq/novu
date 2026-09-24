import { format } from 'date-fns';
import {
  DayPicker,
  type DayPickerProps,
  getDefaultClassNames,
  type MonthCaptionProps,
  useDayPicker,
} from 'react-day-picker';
import { cn } from '@/utils/ui';

type CalendarProps = DayPickerProps & {
  buttonVariant?: 'primary' | 'secondary';
};

function NavButton({
  direction,
  target,
  onNavigate,
}: {
  direction: 'previous' | 'next';
  target: Date | undefined;
  onNavigate: (month: Date) => void;
}) {
  return (
    <button
      type="button"
      aria-label={direction === 'previous' ? 'Go to previous month' : 'Go to next month'}
      disabled={!target}
      onClick={() => target && onNavigate(target)}
      className="flex items-center justify-center rounded-md bg-bg-white p-px shadow-xs disabled:opacity-40"
    >
      <img src={`/images/activity/arrow-${direction === 'previous' ? 'left' : 'right'}-s-line.svg`} alt="" />
    </button>
  );
}

/** Keeps the month label optically centred on the side that has no nav button. */
function NavSpacer() {
  return <span aria-hidden className="size-5 shrink-0" />;
}

function CalendarMonthCaption({ calendarMonth, displayIndex }: MonthCaptionProps) {
  const { goToMonth, months, nextMonth, previousMonth } = useDayPicker();

  return (
    <div className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-bg-weak p-1.5">
      {displayIndex === 0 ? (
        <NavButton direction="previous" target={previousMonth} onNavigate={goToMonth} />
      ) : (
        <NavSpacer />
      )}
      <span className="min-w-0 flex-1 text-center text-label-xs font-medium text-text-sub">
        {format(calendarMonth.date, 'MMMM yyyy')}
      </span>
      {displayIndex === months.length - 1 ? (
        <NavButton direction="next" target={nextMonth} onNavigate={goToMonth} />
      ) : (
        <NavSpacer />
      )}
    </div>
  );
}

export function Calendar({ className, classNames, showOutsideDays = true, components, ...props }: CalendarProps) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      hideNavigation
      className={cn('bg-bg-white p-2', className)}
      classNames={{
        root: cn('w-fit', defaultClassNames.root),
        months: cn('flex gap-0 divide-x divide-stroke-soft', defaultClassNames.months),
        month: cn('w-[288px] p-2', defaultClassNames.month),
        month_grid: cn('w-full border-collapse', defaultClassNames.month_grid),
        weekdays: cn('flex', defaultClassNames.weekdays),
        weekday: cn(
          'w-10 py-2 text-center text-label-xs font-medium uppercase text-text-soft',
          defaultClassNames.weekday
        ),
        week: cn('mt-1 flex w-full', defaultClassNames.week),
        day: cn('relative size-10 p-0 text-center', defaultClassNames.day),
        day_button: cn(
          'size-10 rounded-lg font-mono text-label-xs font-medium text-text-sub hover:bg-bg-weak focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base',
          defaultClassNames.day_button
        ),
        selected: cn(
          '[&>button]:bg-primary-base [&>button]:text-static-white [&>button]:hover:bg-primary-base',
          defaultClassNames.selected
        ),
        range_start: cn(
          'rounded-l-lg bg-primary-alpha-10 [&>button]:bg-primary-base [&>button]:text-static-white',
          defaultClassNames.range_start
        ),
        range_middle: cn(
          'bg-primary-alpha-10 [&>button]:rounded-none [&>button]:bg-transparent [&>button]:text-primary-base',
          defaultClassNames.range_middle
        ),
        range_end: cn(
          'rounded-r-lg bg-primary-alpha-10 [&>button]:bg-primary-base [&>button]:text-static-white',
          defaultClassNames.range_end
        ),
        today: cn('[&>button]:font-bold [&>button]:text-primary-base', defaultClassNames.today),
        outside: cn('[&>button]:text-text-disabled', defaultClassNames.outside),
        disabled: cn('[&>button]:cursor-not-allowed [&>button]:text-text-disabled', defaultClassNames.disabled),
        hidden: cn('invisible', defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        MonthCaption: CalendarMonthCaption,
        ...components,
      }}
      {...props}
    />
  );
}
