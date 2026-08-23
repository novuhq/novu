import { describe, expect, it, vi } from 'vitest';

vi.mock('../output', async (importOriginal) => {
  const original = await importOriginal<typeof import('../output')>();

  return {
    ...original,
    fail: (message: string) => {
      throw new Error(message);
    },
  };
});

const { parseDuration } = await import('./interact');
const { exitCodeFor, EXIT_DENIED, EXIT_GONE, EXIT_OK, EXIT_TIMEOUT } = await import('../output');

describe('parseDuration', () => {
  it('parses plain seconds and suffixed durations', () => {
    expect(parseDuration('90')).toBe(90);
    expect(parseDuration('90s')).toBe(90);
    expect(parseDuration('10m')).toBe(600);
    expect(parseDuration('2h')).toBe(7200);
    expect(parseDuration('1d')).toBe(86400);
  });

  it('rejects malformed durations', () => {
    expect(() => parseDuration('soon')).toThrow(/Invalid duration/);
    expect(() => parseDuration('-5m')).toThrow(/Invalid duration/);
    expect(() => parseDuration('5w')).toThrow(/Invalid duration/);
  });
});

describe('exit code contract', () => {
  const base = {
    id: 'hi_x',
    kind: 'approve' as const,
    prompt: 'p',
    to: 's',
    integrationIdentifier: 'i',
    platform: 'telegram',
    expiresAt: '',
    createdAt: '',
  };

  it('maps terminal statuses to their documented codes', () => {
    expect(exitCodeFor({ ...base, status: 'approved' })).toBe(EXIT_OK);
    expect(exitCodeFor({ ...base, status: 'answered' })).toBe(EXIT_OK);
    expect(exitCodeFor({ ...base, status: 'delivered' })).toBe(EXIT_OK);
    expect(exitCodeFor({ ...base, status: 'denied' })).toBe(EXIT_DENIED);
    expect(exitCodeFor({ ...base, status: 'expired' })).toBe(EXIT_GONE);
    expect(exitCodeFor({ ...base, status: 'canceled' })).toBe(EXIT_GONE);
    expect(exitCodeFor({ ...base, status: 'pending' })).toBe(EXIT_TIMEOUT);
  });
});
