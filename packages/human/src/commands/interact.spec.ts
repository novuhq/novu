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

const { parseDuration, parseHumanToOption, parseIdLabelOption } = await import('./interact');
const { exitCodeFor, EXIT_DENIED, EXIT_GONE, EXIT_OK, EXIT_TIMEOUT } = await import('../output');

describe('parseHumanToOption', () => {
  it('splits comma-separated humans and dedupes', () => {
    expect(parseHumanToOption('alice')).toEqual(['alice']);
    expect(parseHumanToOption(' alice , bob , alice ')).toEqual(['alice', 'bob']);
  });

  it('rejects empty or oversized lists', () => {
    expect(() => parseHumanToOption('  ,  ')).toThrow('at least one subscriberId');
    expect(() => parseHumanToOption(Array.from({ length: 51 }, (_, index) => `s${index}`).join(','))).toThrow(
      'at most 50'
    );
  });
});

describe('parseIdLabelOption', () => {
  it('keeps a stable id when given id:label', () => {
    expect(parseIdLabelOption('trust-tool:Always allow this tool')).toEqual({
      id: 'trust-tool',
      label: 'Always allow this tool',
    });
    expect(parseIdLabelOption('stg:Staging')).toEqual({ id: 'stg', label: 'Staging' });
  });

  it('treats a bare label as a string shorthand', () => {
    expect(parseIdLabelOption('blue-green')).toBe('blue-green');
    expect(parseIdLabelOption('all at once')).toBe('all at once');
  });
});

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
    content: { cardChrome: { title: 'p' } },
    to: ['s'],
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
