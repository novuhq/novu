import { formatSnoozedUntil, formatToRelativeTime } from './formatToRelativeTime';

const SECONDS = {
  inMinute: 60,
  inHour: 3600,
  inDay: 86_400,
};

function dateSecondsAgo(seconds: number, from = new Date()) {
  return new Date(from.getTime() - seconds * 1000);
}

describe('formatToRelativeTime', () => {
  const now = new Date('2026-04-17T12:00:00Z');

  it('returns "now" for less than a minute', () => {
    const result = formatToRelativeTime({ fromDate: dateSecondsAgo(30, now), toDate: now });
    expect(result).toMatch(/now/i);
  });

  it('returns 1 minute for 61 seconds', () => {
    const result = formatToRelativeTime({ fromDate: dateSecondsAgo(61, now), toDate: now });
    expect(result).toMatch(/1/);
    expect(result).toMatch(/min|m\b/i);
  });

  it('returns 1 hour (not 2) for 1 hour + 1 second', () => {
    const result = formatToRelativeTime({
      fromDate: dateSecondsAgo(SECONDS.inHour + 1, now),
      toDate: now,
    });
    expect(result).toMatch(/1/);
    expect(result).not.toMatch(/2/);
  });

  it('returns 1 hour (not 2) for 1 hour + 59 minutes', () => {
    const result = formatToRelativeTime({
      fromDate: dateSecondsAgo(SECONDS.inHour + 59 * SECONDS.inMinute, now),
      toDate: now,
    });
    expect(result).toMatch(/1/);
    expect(result).not.toMatch(/2/);
  });

  it('returns 2 hours for exactly 2 hours', () => {
    const result = formatToRelativeTime({
      fromDate: dateSecondsAgo(2 * SECONDS.inHour, now),
      toDate: now,
    });
    expect(result).toMatch(/2/);
  });

  it('returns 1 day (not 2) for 1 day + 1 second', () => {
    const result = formatToRelativeTime({
      fromDate: dateSecondsAgo(SECONDS.inDay + 1, now),
      toDate: now,
    });
    expect(result).toMatch(/1/);
    expect(result).not.toMatch(/2/);
  });

  it('returns a formatted date for more than a month', () => {
    const result = formatToRelativeTime({
      fromDate: dateSecondsAgo(60 * SECONDS.inDay, now),
      toDate: now,
    });
    expect(result).toMatch(/Feb/);
  });
});

describe('formatSnoozedUntil', () => {
  it('returns "soon" for past dates', () => {
    const pastDate = new Date(Date.now() - 10_000);
    expect(formatSnoozedUntil({ untilDate: pastDate })).toBe('soon');
  });

  it('returns "a moment" for less than a minute', () => {
    const soonDate = new Date(Date.now() + 30_000);
    expect(formatSnoozedUntil({ untilDate: soonDate })).toBe('a moment');
  });
});
