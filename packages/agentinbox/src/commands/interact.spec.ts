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

const {
  assertFlagsFit,
  formatKeylessCapMessage,
  getKeylessCapDetails,
  handleError,
  channelDefaultsFor,
  parseDuration,
  parseToOption,
  parseIdLabelOption,
  parseSendWords,
  resolveTo,
} = await import('./interact');
const { ApiError } = await import('../api/client');
const { exitCodeFor, EXIT_DENIED, EXIT_GONE, EXIT_OK, EXIT_TIMEOUT } = await import('../output');

type CliConfig = import('../config').CliConfig;

describe('parseSendWords', () => {
  it('reads a leading ask, approve or choose as the kind of send', () => {
    expect(parseSendWords(['ask', 'Which env?'])).toEqual({ kind: 'ask', text: 'Which env?' });
    expect(parseSendWords(['approve', 'Deploy?'])).toEqual({ kind: 'approve', text: 'Deploy?' });
    expect(parseSendWords(['choose', 'Pick', 'one'])).toEqual({ kind: 'choose', text: 'Pick one' });
  });

  it('sends anything else as a plain message', () => {
    expect(parseSendWords(['Deployed.'])).toEqual({ kind: 'tell', text: 'Deployed.' });
    expect(parseSendWords(['ask me later'])).toEqual({ kind: 'tell', text: 'ask me later' });
  });

  it('refuses a verb with nothing to send', () => {
    expect(() => parseSendWords(['ask'])).toThrow('`ask` needs the text to send');
    expect(() => parseSendWords(['  '])).toThrow('Pass the message to send');
  });
});

describe('assertFlagsFit', () => {
  it('needs --option on choose and refuses it elsewhere', () => {
    expect(() => assertFlagsFit('choose', {})).toThrow('`choose` needs its options');
    expect(() => assertFlagsFit('ask', { option: ['a'] })).toThrow('`--option` only works with `choose`');
    expect(() => assertFlagsFit('choose', { option: ['a', 'b'] })).not.toThrow();
  });

  it('keeps the button labels to approve and --timeout off plain messages', () => {
    expect(() => assertFlagsFit('ask', { approveLabel: 'Yes' })).toThrow('only work with `approve`');
    expect(() => assertFlagsFit('approve', { approveLabel: 'Yes', extraAction: ['later'] })).not.toThrow();
    expect(() => assertFlagsFit('tell', { timeout: '10s' })).toThrow('a plain message does not wait');
  });
});

describe('parseToOption', () => {
  it('splits comma-separated contacts and dedupes', () => {
    expect(parseToOption('alice')).toEqual(['alice']);
    expect(parseToOption(' alice , bob , alice ')).toEqual(['alice', 'bob']);
  });

  it('rejects empty or oversized lists', () => {
    expect(() => parseToOption('  ,  ')).toThrow('at least one contact');
    expect(() => parseToOption(Array.from({ length: 51 }, (_, index) => `s${index}`).join(','))).toThrow('at most 50');
  });
});

describe('resolveTo', () => {
  const config: CliConfig = {
    apiUrl: 'https://api.novu.co',
    auth: { mode: 'apiKey', secretKey: 'api_key_private' },
    relayAgentIdentifier: 'human-relay',
    subscriberId: 'dave',
  };

  afterEach(() => {
    delete process.env.INBOX_TO;
  });

  it('works env-only, with no subscriberId in the config', () => {
    process.env.INBOX_TO = 'alice';
    expect(resolveTo({ ...config, subscriberId: undefined })).toEqual(['alice']);
  });

  it('splits, trims, and dedupes a comma list from the env', () => {
    process.env.INBOX_TO = ' alice , bob , alice ';
    expect(resolveTo(config)).toEqual(['alice', 'bob']);
  });

  it('applies the recipient cap to the env list and names the source', () => {
    process.env.INBOX_TO = Array.from({ length: 51 }, (_, index) => `s${index}`).join(',');
    expect(() => resolveTo(config)).toThrow('INBOX_TO supports at most 50');
  });

  it('lets a --to flag beat INBOX_TO, and env beat the config file', () => {
    process.env.INBOX_TO = 'alice';
    expect(resolveTo(config, 'carol')).toEqual(['carol']);
    expect(resolveTo(config)).toEqual(['alice']);
  });

  it('falls through to the config subscriberId when the env is unset or blank', () => {
    expect(resolveTo(config)).toBe('dave');
    process.env.INBOX_TO = '  ';
    expect(resolveTo(config)).toBe('dave');
  });
});

describe('channelDefaultsFor', () => {
  const config: CliConfig = {
    apiUrl: 'https://api.novu.co',
    auth: { mode: 'apiKey', secretKey: 'api_key_private' },
    relayAgentIdentifier: 'human-relay',
    subscriberId: 'dave',
  };

  it('applies both defaults when you message yourself', () => {
    expect(channelDefaultsFor(config, undefined, 'dave')).toEqual({ useEnvVia: true, useSavedDefault: true });
    expect(channelDefaultsFor(config, 'dave', ['dave'])).toEqual({ useEnvVia: true, useSavedDefault: true });
  });

  it('pairs INBOX_VIA with INBOX_TO recipients but keeps your saved default to yourself', () => {
    expect(channelDefaultsFor(config, undefined, ['alice'])).toEqual({ useEnvVia: true, useSavedDefault: false });
    expect(channelDefaultsFor({ ...config, subscriberId: undefined }, undefined, ['alice'])).toEqual({
      useEnvVia: true,
      useSavedDefault: false,
    });
  });

  it('applies neither when --to names someone else', () => {
    expect(channelDefaultsFor(config, 'alice', ['alice'])).toEqual({ useEnvVia: false, useSavedDefault: false });
    expect(channelDefaultsFor(config, 'dave,alice', ['dave', 'alice'])).toEqual({
      useEnvVia: false,
      useSavedDefault: false,
    });
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

describe('keyless cap errors', () => {
  const capError = (body: unknown, status = 429, message = 'limit') =>
    new ApiError(message, status, 'POST https://api.novu.co/v1/human/interactions', body);

  it('detects the structured 429 body and extracts the claim link', () => {
    const err = capError({
      code: 'KEYLESS_HUMAN_CAP_REACHED',
      claimUrl: 'https://agentinbox.md/claim?token=t',
      cap: 5,
      browserLogin: true,
    });
    expect(getKeylessCapDetails(err)).toEqual({
      claimUrl: 'https://agentinbox.md/claim?token=t',
      cap: 5,
      browserLogin: true,
      reason: 'cap',
    });
  });

  it('falls back to the message wording when the body has no code', () => {
    const err = capError({}, 429, "You've used the 5 free messages of this keyless demo.");
    expect(getKeylessCapDetails(err)).toEqual({
      claimUrl: undefined,
      cap: undefined,
      browserLogin: false,
      reason: 'cap',
    });
  });

  it('ignores other 429s and non-API errors', () => {
    expect(getKeylessCapDetails(capError({}, 429, 'already has 25 pending interactions'))).toBeNull();
    expect(getKeylessCapDetails(capError({ code: 'KEYLESS_HUMAN_CAP_REACHED' }, 400))).toBeNull();
    expect(getKeylessCapDetails(new Error('boom'))).toBeNull();
  });

  it('sends the operator to npx @agentinbox/cli login where the API has it, with the claim link as a fallback', () => {
    const text = formatKeylessCapMessage({
      claimUrl: 'https://agentinbox.md/claim?token=t',
      cap: 5,
      browserLogin: true,
    });
    expect(text).toContain('5 free messages');
    expect(text).toContain('run: npx @agentinbox/cli login');
    expect(text).toContain('https://agentinbox.md/claim?token=t');
    expect(text).not.toContain('--secret-key');
  });

  it('keeps the secret-key route where the API has no browser login (self-hosted)', () => {
    const text = formatKeylessCapMessage({
      claimUrl: 'https://dash/connect/claim?token=t',
      cap: 5,
      browserLogin: false,
    });
    expect(text).toContain('https://dash/connect/claim?token=t');
    expect(text).toContain('npx @agentinbox/cli setup --secret-key');
    expect(text).not.toContain('npx @agentinbox/cli login');
  });

  it('sends an outbound-email refusal to npx @agentinbox/cli login with the claim link', () => {
    const err = capError(
      {
        code: 'KEYLESS_EMAIL_REQUIRES_ACCOUNT',
        claimUrl: 'https://agentinbox.md/claim?token=t',
        browserLogin: true,
      },
      403,
      'Outbound email needs an Agent Inbox account.'
    );
    const details = getKeylessCapDetails(err);

    expect(details).toEqual({
      claimUrl: 'https://agentinbox.md/claim?token=t',
      browserLogin: true,
      reason: 'email',
    });
    const text = formatKeylessCapMessage(details!);
    expect(text).toContain('run: npx @agentinbox/cli login');
    expect(text).toContain('https://agentinbox.md/claim?token=t');
    expect(text).not.toContain('free messages');
  });

  it('routes the cap error through fail with the claim link', () => {
    const err = capError({ code: 'KEYLESS_HUMAN_CAP_REACHED', claimUrl: 'https://dash/connect/claim?token=t' });
    expect(() => handleError(err)).toThrow('https://dash/connect/claim?token=t');
  });
});
