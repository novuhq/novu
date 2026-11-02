// @vitest-environment jsdom

import { ApiServiceLevelEnum } from '@novu/shared';
import { describe, expect, it, vi } from 'vitest';
import {
  buildActivityDateFilters,
  parseActivityDateRange,
  parseActivityTransactionIds,
  resolveActivityDateRange,
} from './activityFilters';

vi.mock('../config', () => ({
  IS_SELF_HOSTED: false,
}));

describe('activity filters', () => {
  it('normalizes legacy date-range aliases at the URL boundary', () => {
    expect(parseActivityDateRange('24h')).toEqual({ kind: 'preset', preset: 'today' });
    expect(parseActivityDateRange('90d')).toEqual({ kind: 'preset', preset: '3M' });
  });

  it('falls back to today for incomplete custom and unknown ranges', () => {
    expect(parseActivityDateRange('custom', '2026-09-01T00:00:00.000Z')).toEqual({
      kind: 'preset',
      preset: 'today',
    });
    expect(parseActivityDateRange('unexpected')).toEqual({ kind: 'preset', preset: 'today' });
  });

  it('requires both custom bounds in the typed model', () => {
    expect(parseActivityDateRange('custom', '2026-09-01T00:00:00.000Z', '2026-09-02T23:59:59.999Z')).toEqual({
      kind: 'custom',
      after: '2026-09-01T00:00:00.000Z',
      before: '2026-09-02T23:59:59.999Z',
    });
  });

  it('resolves the 3-month preset as exactly 90 days', () => {
    const now = new Date('2026-09-24T12:00:00.000Z');

    expect(resolveActivityDateRange({ kind: 'preset', preset: '3M' }, now)).toEqual({
      after: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      before: now.toISOString(),
    });
  });

  it('normalizes comma-delimited transaction ids once', () => {
    expect(parseActivityTransactionIds(' first, second ,, third ')).toEqual(['first', 'second', 'third']);
  });

  it('gates calendar presets by their resolved start instead of an approximate duration', () => {
    const options = buildActivityDateFilters({
      organization: { createdAt: new Date('2024-01-01T00:00:00.000Z') },
      apiServiceLevel: ApiServiceLevelEnum.FREE,
      now: new Date('2026-09-05T12:00:00.000Z'),
    });

    expect(options.find((option) => option.value === 'mtd')?.disabled).toBe(false);
  });

  it.each([
    { timeZone: 'Europe/London', now: '2026-10-30T12:00:00.000Z', extraMs: 60 * 60 * 1000 },
    { timeZone: 'America/New_York', now: '2026-11-03T15:00:00.000Z', extraMs: 60 * 60 * 1000 },
    { timeZone: 'Asia/Kolkata', now: '2026-10-30T12:00:00.000Z', extraMs: 0 },
  ])('keeps Last 7 days selectable on Pro in $timeZone', ({ timeZone, now: nowIso, extraMs }) => {
    withTimeZone(timeZone, () => {
      const now = new Date(nowIso);
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      const { after } = resolveActivityDateRange({ kind: 'preset', preset: '7d' }, now);

      expect(after).toBe(new Date(now.getTime() - weekMs - extraMs).toISOString());

      const options = buildActivityDateFilters({
        organization: { createdAt: new Date('2026-01-01T00:00:00.000Z') },
        apiServiceLevel: ApiServiceLevelEnum.PRO,
        now,
      });

      expect(options.find((option) => option.value === '7d')?.disabled).toBe(false);
      expect(options.find((option) => option.value === '30d')?.disabled).toBe(true);
    });
  });
});

function withTimeZone(timeZone: string, run: () => void) {
  const originalTimeZone = process.env.TZ;
  process.env.TZ = timeZone;

  try {
    run();
  } finally {
    if (originalTimeZone === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = originalTimeZone;
    }
  }
}
