const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * UTC calendar day `YYYY-MM-DD` for a timestamp.
 */
export function toUtcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface InclusiveUtcDayBounds {
  /** UTC midnight at the start of `startDate`'s day. */
  firstDayStart: Date;
  /** UTC midnight after the day of `endDate - 1ms`: exclusive end of the last inclusive day. */
  lastDayEnd: Date;
  /** `startDate` and `endDate` are both UTC midnights, so the inclusive days cover exactly the range. */
  isUtcDayAligned: boolean;
}

/**
 * Maps a half-open Date range `[startDate, endDate)` onto the inclusive UTC calendar days it touches.
 * Subtracting 1ms from `endDate` keeps a midnight exclusive period end from including the next day
 * (e.g. Stripe `current_period_end`).
 */
export function inclusiveUtcDayBounds(startDate: Date, endDate: Date): InclusiveUtcDayBounds {
  const firstDayStart = startOfUtcDay(startDate);
  const lastDayEnd = new Date(startOfUtcDay(new Date(endDate.getTime() - 1)).getTime() + DAY_MS);

  return {
    firstDayStart,
    lastDayEnd,
    isUtcDayAligned: firstDayStart.getTime() === startDate.getTime() && lastDayEnd.getTime() === endDate.getTime(),
  };
}

/**
 * First and last inclusive UTC calendar day (`YYYY-MM-DD`) of `[startDate, endDate)`; see {@link inclusiveUtcDayBounds}.
 */
export function toInclusiveUtcDays(startDate: Date, endDate: Date): { start: string; end: string } {
  const { firstDayStart, lastDayEnd } = inclusiveUtcDayBounds(startDate, endDate);

  return {
    start: toUtcDay(firstDayStart),
    end: toUtcDay(new Date(lastDayEnd.getTime() - DAY_MS)),
  };
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
