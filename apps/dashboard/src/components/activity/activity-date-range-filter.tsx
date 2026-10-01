import { endOfMinute, format, isValid, setHours, setMinutes, startOfDay, startOfMonth, subMonths } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { Link } from 'react-router-dom';
import { Button } from '@/components/primitives/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import {
  ACTIVITY_DATE_RANGE_OPTIONS,
  type ActivityDateRange,
  type ActivityDateRangePreset,
  resolveActivityDateRange,
} from '@/utils/activityFilters';
import { ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { ActivityCalendar } from './activity-calendar';

type ActivityDateRangeFilterProps = {
  value: ActivityDateRange;
  onChange: (value: ActivityDateRange) => void;
  presetOptions: Array<{ value: ActivityDateRangePreset; label: string; disabled: boolean }>;
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

function toRange(value: ActivityDateRange): DateRange | undefined {
  const resolved = resolveActivityDateRange(value);
  const from = resolved.after ? new Date(resolved.after) : undefined;
  const to = resolved.before ? new Date(resolved.before) : undefined;

  if (!from || !isValid(from)) {
    return undefined;
  }

  return { from, to: to && isValid(to) ? to : undefined };
}

function formatTrigger(value: ActivityDateRange) {
  if (value.kind === 'preset') {
    return ACTIVITY_DATE_RANGE_OPTIONS.find((option) => option.value === value.preset)?.label ?? 'Today';
  }

  const after = new Date(value.after);
  const before = new Date(value.before);
  if (!after || !before || !isValid(after) || !isValid(before)) {
    return 'Custom';
  }

  return `${format(after, 'MMM dd, HH:mm')} → ${format(before, 'MMM dd, HH:mm')}`;
}

export function ActivityDateRangeFilter({
  value,
  onChange,
  presetOptions,
  retentionStart,
}: ActivityDateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(() => toRange(value));
  const [startTime, setStartTime] = useState(() => {
    const range = toRange(value);

    return range?.from ? format(range.from, 'HH:mm') : '00:00';
  });
  const [endTime, setEndTime] = useState(() => {
    const range = toRange(value);

    return range?.to ? format(range.to, 'HH:mm') : '23:59';
  });
  const timeZoneLabel = useMemo(() => getTimeZoneLabel(), []);

  const resetDraft = () => {
    const nextRange = toRange(value);
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

  const handlePresetSelect = (preset: ActivityDateRangePreset) => {
    onChange({ kind: 'preset', preset });
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
  const selectedEnd = draftRange?.to ? applyTime(draftRange.to, endTime) : undefined;
  /** The end input has minute precision, so the inclusive upper bound has to cover the whole selected minute. */
  const before = selectedEnd ? endOfMinute(selectedEnd) : undefined;
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

    onChange({ kind: 'custom', after: after.toISOString(), before: before.toISOString() });
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
          <span className="truncate text-xs font-normal">{formatTrigger(value)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="flex w-[727px] max-w-[calc(100vw-2rem)] overflow-hidden border-stroke-soft p-0 shadow-md"
      >
        <div className="w-[150px] shrink-0 border-r border-stroke-soft bg-bg-white p-2">
          <div className="flex flex-col gap-2">
            {presetOptions.map((option) => {
              const isSelected = value.kind === 'preset' && value.preset === option.value;
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
          <ActivityCalendar
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
