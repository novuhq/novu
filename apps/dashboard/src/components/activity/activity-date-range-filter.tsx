import { format, isValid, setHours, setMinutes, startOfDay, startOfMonth, subMonths } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { Link } from 'react-router-dom';
import { Button } from '@/components/primitives/button';
import { Calendar } from '@/components/primitives/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import type { ActivityFiltersData } from '@/types/activity';
import { ACTIVITY_DATE_RANGE_OPTIONS, resolveActivityDateRange } from '@/utils/activityFilters';
import { ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';

type ActivityDateRangeFilterProps = {
  filters: ActivityFiltersData;
  onChange: (filters: ActivityFiltersData) => void;
  presetOptions: Array<{ value: string; label: string; disabled: boolean }>;
  retentionStart?: Date;
};

/** Times are entered in the browser's zone, so label it the way the browser reports it (`UTC`, `EDT`, `GMT+3`, ...). */
function getTimeZoneLabel() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(new Date());

  return parts.find((part) => part.type === 'timeZoneName')?.value ?? 'Local';
}

function parseTime(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) {
    return undefined;
  }

  return { hours: Number(match[1]), minutes: Number(match[2]) };
}

function applyTime(date: Date, value: string) {
  const time = parseTime(value);
  if (!time) {
    return undefined;
  }

  return setMinutes(setHours(startOfDay(date), time.hours), time.minutes);
}

function toRange(filters: ActivityFiltersData): DateRange | undefined {
  const resolved = resolveActivityDateRange(filters.dateRange, filters.after, filters.before);
  const from = resolved.after ? new Date(resolved.after) : undefined;
  const to = resolved.before ? new Date(resolved.before) : undefined;

  if (!from || !isValid(from)) {
    return undefined;
  }

  return { from, to: to && isValid(to) ? to : undefined };
}

function formatTrigger(filters: ActivityFiltersData) {
  if (filters.dateRange !== 'custom') {
    return ACTIVITY_DATE_RANGE_OPTIONS.find((option) => option.value === filters.dateRange)?.label ?? 'Today';
  }

  const after = filters.after ? new Date(filters.after) : undefined;
  const before = filters.before ? new Date(filters.before) : undefined;
  if (!after || !before || !isValid(after) || !isValid(before)) {
    return 'Custom';
  }

  return `${format(after, 'MMM dd, HH:mm')} → ${format(before, 'MMM dd, HH:mm')}`;
}

export function ActivityDateRangeFilter({
  filters,
  onChange,
  presetOptions,
  retentionStart,
}: ActivityDateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(() => toRange(filters));
  const [startTime, setStartTime] = useState(() => {
    const range = toRange(filters);

    return range?.from ? format(range.from, 'HH:mm') : '00:00';
  });
  const [endTime, setEndTime] = useState(() => {
    const range = toRange(filters);

    return range?.to ? format(range.to, 'HH:mm') : '23:59';
  });
  const timeZoneLabel = useMemo(() => getTimeZoneLabel(), []);

  const resetDraft = () => {
    const nextRange = toRange(filters);
    setDraftRange(nextRange);
    setStartTime(nextRange?.from ? format(nextRange.from, 'HH:mm') : '00:00');
    setEndTime(nextRange?.to ? format(nextRange.to, 'HH:mm') : '23:59');
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      resetDraft();
    }
    setOpen(nextOpen);
  };

  const handlePresetSelect = (value: string) => {
    onChange({
      ...filters,
      dateRange: value,
      after: undefined,
      before: undefined,
    });
    setOpen(false);
  };

  const handleRangeSelect = (range: DateRange | undefined) => {
    setDraftRange(range);

    if (range?.from && !range.to) {
      setStartTime('00:00');
      setEndTime('23:59');
    }
  };

  const after = draftRange?.from ? applyTime(draftRange.from, startTime) : undefined;
  const before = draftRange?.to ? applyTime(draftRange.to, endTime) : undefined;
  const bufferedRetentionStart = retentionStart ? new Date(retentionStart.getTime() - 60 * 60 * 1000) : undefined;
  const isRangeValid =
    after !== undefined &&
    before !== undefined &&
    after.getTime() <= before.getTime() &&
    (!bufferedRetentionStart || after.getTime() >= bufferedRetentionStart.getTime());

  const handleApply = () => {
    if (!after || !before || !isRangeValid) {
      return;
    }

    onChange({
      ...filters,
      dateRange: 'custom',
      after: after.toISOString(),
      before: before.toISOString(),
    });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          mode="outline"
          size="sm"
          className="h-7 max-w-[260px] border-neutral-200 bg-white px-1.5 text-neutral-600 ring-0"
        >
          <CalendarIcon className="size-4 shrink-0" />
          <span className="truncate text-xs font-normal">{formatTrigger(filters)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="flex w-[727px] max-w-[calc(100vw-2rem)] overflow-hidden border-stroke-soft p-0 shadow-md"
      >
        <div className="w-[150px] shrink-0 border-r border-stroke-soft bg-bg-white p-2">
          <div className="flex flex-col gap-2">
            {presetOptions.map((option) => {
              const isSelected = filters.dateRange === option.value;
              const rowClassName = cn(
                'flex h-8 w-full items-center gap-2 rounded-lg px-3 text-left text-label-xs font-medium',
                isSelected ? 'bg-bg-weak text-text-strong' : 'text-text-sub hover:bg-bg-weak',
                option.disabled && 'text-text-disabled hover:bg-transparent'
              );

              if (!option.disabled) {
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handlePresetSelect(option.value)}
                    className={rowClassName}
                  >
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  </button>
                );
              }

              return (
                <div key={option.value} className={rowClassName}>
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        to={`${ROUTES.SETTINGS_BILLING}?utm_source=activity-feed-retention`}
                        aria-label={`Upgrade to unlock ${option.label}`}
                      >
                        <img src="/images/activity/lock-star-line.svg" alt="" className="size-4" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>Upgrade your plan to unlock extended retention periods</TooltipContent>
                  </Tooltip>
                </div>
              );
            })}
          </div>
        </div>

        <div className="min-w-0 flex-1 bg-bg-white">
          <Calendar
            mode="range"
            numberOfMonths={2}
            defaultMonth={subMonths(startOfMonth(new Date()), 1)}
            selected={draftRange}
            onSelect={handleRangeSelect}
            disabled={[{ after: new Date() }, ...(retentionStart ? [{ before: startOfDay(retentionStart) }] : [])]}
            className="p-0"
          />

          <div className="flex min-h-12 items-center gap-2 border-t border-stroke-soft p-2">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 text-label-xs font-medium text-text-sub">
              <span>{draftRange?.from ? format(draftRange.from, 'MMM dd, yyyy') : 'Start date'}</span>
              <input
                aria-label="Start time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                placeholder="00:00"
                className="h-7 w-[54px] rounded-md border border-stroke-soft bg-bg-white px-1.5 font-mono text-label-xs text-text-strong outline-none focus:ring-2 focus:ring-primary-alpha-10"
              />
              <span className="text-text-soft">→</span>
              <span>{draftRange?.to ? format(draftRange.to, 'MMM dd, yyyy') : 'End date'}</span>
              <input
                aria-label="End time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                placeholder="23:59"
                className="h-7 w-[54px] rounded-md border border-stroke-soft bg-bg-white px-1.5 font-mono text-label-xs text-text-strong outline-none focus:ring-2 focus:ring-primary-alpha-10"
              />
              <span className="text-text-soft">{timeZoneLabel}</span>
            </div>
            <Button
              variant="secondary"
              mode="outline"
              size="xs"
              onClick={() => {
                resetDraft();
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button size="xs" disabled={!isRangeValid} onClick={handleApply}>
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
