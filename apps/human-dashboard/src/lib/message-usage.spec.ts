import { describe, expect, it } from 'vitest';
import { asOf, fromNow, type MessageUsage, usedUpWindow } from './message-usage';

const NOW = Date.parse('2026-11-20T18:10:00.000Z');
const TOMORROW = '2026-11-21T00:00:00.000Z';
const NEXT_MONTH = '2026-12-01T00:00:00.000Z';

function usage(daily: number, monthly: number): MessageUsage {
  return {
    daily: { used: daily, limit: 50, resetsAt: TOMORROW },
    monthly: { used: monthly, limit: 300, resetsAt: NEXT_MONTH },
  };
}

describe('usedUpWindow', () => {
  it('is null while both windows have messages left', () => {
    expect(usedUpWindow(usage(49, 120), NOW)).toBeNull();
  });

  it('names the day once its messages are all used', () => {
    expect(usedUpWindow(usage(50, 120), NOW)?.cap).toBe('daily');
  });

  it('names the month before the day, as it lasts longer', () => {
    expect(usedUpWindow(usage(50, 300), NOW)?.cap).toBe('monthly');
  });

  it('is null once the day has started over', () => {
    expect(usedUpWindow(usage(50, 120), Date.parse(TOMORROW))).toBeNull();
  });

  it('is null where nothing is counted', () => {
    expect(usedUpWindow({ daily: null, monthly: null }, NOW)).toBeNull();
  });
});

describe('asOf', () => {
  it('reads a window that started over as unused', () => {
    const window = { used: 50, limit: 50, resetsAt: TOMORROW };

    expect(asOf(window, NOW).used).toBe(50);
    expect(asOf(window, Date.parse(TOMORROW)).used).toBe(0);
  });
});

describe('fromNow', () => {
  it('counts minutes under an hour, hours under two days, and days after that', () => {
    expect(fromNow('2026-11-20T18:40:00.000Z', NOW)).toBe('in 30 minutes');
    expect(fromNow(TOMORROW, NOW)).toBe('in about 6 hours');
    expect(fromNow(NEXT_MONTH, NOW)).toBe('in about 10 days');
  });
});
