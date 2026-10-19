/**
 * UTC calendar day `YYYY-MM-DD` for a timestamp.
 */
export function toUtcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Maps a half-open Date range `[startDate, endDate)` to inclusive UTC calendar days.
 * Subtracting 1ms from `endDate` keeps a midnight exclusive period end from including the next day
 * (e.g. Stripe `current_period_end`).
 */
export function toInclusiveUtcDays(startDate: Date, endDate: Date): { start: string; end: string } {
  return {
    start: toUtcDay(startDate),
    end: toUtcDay(new Date(endDate.getTime() - 1)),
  };
}
