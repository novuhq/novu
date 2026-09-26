// @vitest-environment jsdom

import { ApiServiceLevelEnum } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import {
  buildActivityDateFilters,
  parseActivityDateRange,
  parseActivityTransactionIds,
  resolveActivityDateRange,
} from './activityFilters';

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
});
