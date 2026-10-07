const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * UTC calendar day `YYYY-MM-DD` for a timestamp.
 */
export function toUtcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface InclusiveUtcDayBounds {
  /** Inclusive UTC calendar day of `startDate`, `YYYY-MM-DD`. */
  start: string;
  /** Inclusive UTC calendar day of `endDate - 1ms`, `YYYY-MM-DD`. */
  end: string;
  /** UTC midnight at the start of `start`. */
  startDayStart: Date;
  /** UTC midnight after `end`: exclusive end of the last inclusive day. */
  endDayEnd: Date;
}

/**
 * Maps a half-open Date range `[startDate, endDate)` onto inclusive UTC calendar days.
 * Subtracting 1ms from `endDate` keeps a midnight exclusive period end from including the next day
 * (e.g. Stripe `current_period_end`). `endDayEnd` is the midnight after that last day.
 */
export function inclusiveUtcDayBounds(startDate: Date, endDate: Date): InclusiveUtcDayBounds {
  const startDayStart = startOfUtcDay(startDate);
  const lastInclusiveDayStart = startOfUtcDay(new Date(endDate.getTime() - 1));

  return {
    start: toUtcDay(startDayStart),
    end: toUtcDay(lastInclusiveDayStart),
    startDayStart,
    endDayEnd: new Date(lastInclusiveDayStart.getTime() + DAY_MS),
  };
}

/**
 * `YYYY-MM-DD` pair from {@link inclusiveUtcDayBounds}.
 */
export function toInclusiveUtcDays(startDate: Date, endDate: Date): { start: string; end: string } {
  const { start, end } = inclusiveUtcDayBounds(startDate, endDate);

  return { start, end };
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
