import { describe, expect, it } from 'vitest';
import { formatClock, formatDuration } from './format-duration';

describe('formatDuration', () => {
  it('renders sub-second values in milliseconds', () => {
    expect(formatDuration(0)).toBe('0ms');
    expect(formatDuration(540)).toBe('540ms');
    expect(formatDuration(999)).toBe('999ms');
  });

  it('renders single-digit seconds with one decimal', () => {
    expect(formatDuration(1500)).toBe('1.5s');
    expect(formatDuration(9_999)).toBe('9.9s');
  });

  it('renders 10s+ as integer seconds', () => {
    expect(formatDuration(12_300)).toBe('12s');
    expect(formatDuration(59_900)).toBe('59s');
  });

  it('renders minutes and seconds', () => {
    expect(formatDuration(60_000)).toBe('1m00s');
    expect(formatDuration(72_500)).toBe('1m12s');
    expect(formatDuration(3_599_000)).toBe('59m59s');
  });

  it('renders hours and minutes for very long runs', () => {
    expect(formatDuration(3_600_000)).toBe('1h00m');
    expect(formatDuration(3_725_000)).toBe('1h02m');
  });

  it('clamps negative or NaN inputs to "0ms"', () => {
    expect(formatDuration(-100)).toBe('0ms');
    expect(formatDuration(Number.NaN)).toBe('0ms');
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe('0ms');
  });
});

describe('formatClock', () => {
  it('renders MM:SS for sub-hour durations', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(1_000)).toBe('00:01');
    expect(formatClock(72_500)).toBe('01:12');
    expect(formatClock(3_599_000)).toBe('59:59');
  });

  it('renders H:MM:SS once the run crosses an hour', () => {
    expect(formatClock(3_600_000)).toBe('1:00:00');
    expect(formatClock(3_725_000)).toBe('1:02:05');
  });

  it('clamps negative or NaN inputs to "00:00"', () => {
    expect(formatClock(-100)).toBe('00:00');
    expect(formatClock(Number.NaN)).toBe('00:00');
  });
});
