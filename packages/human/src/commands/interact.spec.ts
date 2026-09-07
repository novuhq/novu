import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../output', async (importOriginal) => {
  const original = await importOriginal<typeof import('../output')>();

  return {
    ...original,
    fail: (message: string) => {
      throw new Error(message);
    },
  };
});

const { formatKeylessCapMessage, getKeylessCapDetails, handleError, parseDuration, parseHumanToOption, resolveTo } =
  await import('./interact');
const { HumanApiError } = await import('../api/client');
const { exitCodeFor, EXIT_DENIED, EXIT_GONE, EXIT_OK, EXIT_TIMEOUT } = await import('../output');

type HumanCliConfig = import('../config').HumanCliConfig;

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

describe('resolveTo', () => {
  const config: HumanCliConfig = {
    apiUrl: 'https://api.novu.co',
    auth: { mode: 'apiKey', secretKey: 'api_key_private' },
    relayAgentIdentifier: 'human-relay',
    subscriberId: 'dave',
  };

  afterEach(() => {
    delete process.env.HUMAN_TO;
  });

  it('works env-only, with no subscriberId in the config', () => {
    process.env.HUMAN_TO = 'alice';
    expect(resolveTo({ ...config, subscriberId: undefined })).toEqual(['alice']);
  });

  it('splits, trims, and dedupes a comma list from the env', () => {
    process.env.HUMAN_TO = ' alice , bob , alice ';
    expect(resolveTo(config)).toEqual(['alice', 'bob']);
  });

  it('applies the recipient cap to the env list and names the source', () => {
    process.env.HUMAN_TO = Array.from({ length: 51 }, (_, index) => `s${index}`).join(',');
    expect(() => resolveTo(config)).toThrow('HUMAN_TO supports at most 50');
  });

  it('lets a --to flag beat HUMAN_TO, and env beat the config file', () => {
    process.env.HUMAN_TO = 'alice';
    expect(resolveTo(config, 'carol')).toEqual(['carol']);
    expect(resolveTo(config)).toEqual(['alice']);
  });

  it('falls through to the config subscriberId when the env is unset or blank', () => {
    expect(resolveTo(config)).toBe('dave');
    process.env.HUMAN_TO = '  ';
    expect(resolveTo(config)).toBe('dave');
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
    prompt: 'p',
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

describe('keyless cap errors', () => {
  const capError = (body: unknown, status = 429, message = 'limit') =>
    new HumanApiError(message, status, 'POST https://api.novu.co/v1/human/interactions', body);

  it('detects the structured 429 body and extracts the claim link', () => {
    const err = capError({ code: 'KEYLESS_HUMAN_CAP_REACHED', claimUrl: 'https://dash/connect/claim?token=t', cap: 5 });
    expect(getKeylessCapDetails(err)).toEqual({ claimUrl: 'https://dash/connect/claim?token=t', cap: 5 });
  });

  it('falls back to the message wording when the body has no code', () => {
    const err = capError({}, 429, "You've used the 5 free messages of this keyless demo.");
    expect(getKeylessCapDetails(err)).toEqual({ claimUrl: undefined, cap: undefined });
  });

  it('ignores other 429s and non-API errors', () => {
    expect(getKeylessCapDetails(capError({}, 429, 'already has 25 pending interactions'))).toBeNull();
    expect(getKeylessCapDetails(capError({ code: 'KEYLESS_HUMAN_CAP_REACHED' }, 400))).toBeNull();
    expect(getKeylessCapDetails(new Error('boom'))).toBeNull();
  });

  it('prints the claim link and the recovery command', () => {
    const text = formatKeylessCapMessage({ claimUrl: 'https://dash/connect/claim?token=t', cap: 5 });
    expect(text).toContain('5 free messages');
    expect(text).toContain('https://dash/connect/claim?token=t');
    expect(text).toContain('human setup --secret-key');
  });

  it('routes the cap error through fail with the claim link', () => {
    const err = capError({ code: 'KEYLESS_HUMAN_CAP_REACHED', claimUrl: 'https://dash/connect/claim?token=t' });
    expect(() => handleError(err)).toThrow('https://dash/connect/claim?token=t');
  });
});
