import { beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import type { HumanCliConfig } from '../config';

const listAgentIntegrations = vi.fn();
const hasChannelEndpoint = vi.fn();
const generateConnectOauthUrl = vi.fn();
const issueTelegramSubscriberLink = vi.fn();
const getSubscriberEmail = vi.fn();
const setupHumanRelay = vi.fn();
const createHumanInvite = vi.fn();
const saveConfig = vi.fn();
const clientFromConfig = vi.fn();

vi.mock('../api/setup', () => ({
  listAgentIntegrations: (...args: unknown[]) => listAgentIntegrations(...args),
  hasChannelEndpoint: (...args: unknown[]) => hasChannelEndpoint(...args),
  generateConnectOauthUrl: (...args: unknown[]) => generateConnectOauthUrl(...args),
  issueTelegramSubscriberLink: (...args: unknown[]) => issueTelegramSubscriberLink(...args),
  getSubscriberEmail: (...args: unknown[]) => getSubscriberEmail(...args),
}));

vi.mock('../api/human', () => ({
  setupHumanRelay: (...args: unknown[]) => setupHumanRelay(...args),
  createHumanInvite: (...args: unknown[]) => createHumanInvite(...args),
}));

vi.mock('../config', async (importOriginal) => {
  const original = await importOriginal<typeof import('../config')>();

  return {
    ...original,
    saveConfig: (...args: unknown[]) => saveConfig(...args),
  };
});

vi.mock('./interact', async (importOriginal) => {
  const original = await importOriginal<typeof import('./interact')>();

  return {
    ...original,
    clientFromConfig: (...args: unknown[]) => clientFromConfig(...args),
  };
});

const { formatChannels, parseInviteHumanId, resolveInviteVia, runInvite, splitName } = await import('./invite');

const operatorConfig: HumanCliConfig = {
  apiUrl: 'https://api.novu.co',
  auth: { mode: 'apiKey', secretKey: 'key' },
  relayAgentIdentifier: 'human-relay',
  subscriberId: 'operator',
};

const INVITE_URL = 'https://dashboard.novu.co/agents/invite/tok_123';
const INVITE_EXPIRES_AT = '2026-10-02T12:00:00.000Z';

function slackLink() {
  return { integration: { identifier: 'slack-1', providerId: 'slack', active: true } };
}

function telegramLink() {
  return { integration: { identifier: 'tg-1', providerId: 'telegram', active: true } };
}

function emailLink() {
  return { integration: { identifier: 'email-1', providerId: 'novu-email-agent', active: true } };
}

function pageInvite(connected: { telegram?: boolean; slack?: boolean } = {}) {
  return {
    url: INVITE_URL,
    expiresAt: INVITE_EXPIRES_AT,
    channels: [
      { via: 'telegram', integrationIdentifier: 'tg-1', connected: connected.telegram ?? false },
      { via: 'slack', integrationIdentifier: 'slack-1', connected: connected.slack ?? false },
    ],
  };
}

let stdoutWrite: MockInstance;

function stdoutText(): string {
  return stdoutWrite.mock.calls.map((call) => String(call[0])).join('');
}

function resetMocks() {
  stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  listAgentIntegrations.mockReset();
  hasChannelEndpoint.mockReset();
  generateConnectOauthUrl.mockReset();
  issueTelegramSubscriberLink.mockReset();
  getSubscriberEmail.mockReset();
  setupHumanRelay.mockReset();
  createHumanInvite.mockReset();
  saveConfig.mockReset();
  clientFromConfig.mockReset();
  clientFromConfig.mockReturnValue({
    client: { axios: {} },
    config: { ...operatorConfig },
  });
  setupHumanRelay.mockResolvedValue({
    agentId: 'agent-1',
    agentIdentifier: 'human-relay',
    subscriberId: 'alice',
  });
}

describe('parseInviteHumanId', () => {
  it('trims a single subscriberId and rejects lists', () => {
    expect(parseInviteHumanId(' alice ')).toBe('alice');
    expect(() => parseInviteHumanId('  ')).toThrow('subscriberId');
    expect(() => parseInviteHumanId('alice,bob')).toThrow('one human at a time');
  });
});

describe('splitName', () => {
  it('splits on the first space and collapses whitespace', () => {
    expect(splitName('Alice Chen')).toEqual({ firstName: 'Alice', lastName: 'Chen' });
    expect(splitName('  Mary   Ann Smith ')).toEqual({ firstName: 'Mary', lastName: 'Ann Smith' });
    expect(splitName('Alice')).toEqual({ firstName: 'Alice' });
  });

  it('returns undefined for blank input so no name is cleared', () => {
    expect(splitName(undefined)).toBeUndefined();
    expect(splitName('   ')).toBeUndefined();
  });
});

describe('resolveInviteVia', () => {
  it('normalizes an explicit --via', () => {
    expect(resolveInviteVia('Slack')).toBe('slack');
  });

  it('never infers a channel without --via — the invite page lets the human pick', () => {
    expect(resolveInviteVia()).toBeUndefined();
    expect(resolveInviteVia('')).toBeUndefined();
  });

  it('rejects unknown channels', () => {
    expect(() => resolveInviteVia('whatsapp')).toThrow('Unknown channel "whatsapp"');
  });
});

describe('formatChannels', () => {
  it('joins channels for prose', () => {
    expect(formatChannels(['telegram'], 'or')).toBe('telegram');
    expect(formatChannels(['telegram', 'slack'], 'or')).toBe('telegram or slack');
    expect(formatChannels(['telegram', 'slack', 'email'], 'and')).toBe('telegram, slack and email');
  });
});

describe('runInvite with --via', () => {
  beforeEach(resetMocks);

  it('short-circuits when the invitee is already linked and does not change local identity', async () => {
    listAgentIntegrations.mockResolvedValue([slackLink()]);
    hasChannelEndpoint.mockResolvedValue(true);

    const result = await runInvite('alice', { via: 'slack' });

    expect(result).toEqual({ humanId: 'alice', linkedOn: ['slack'], alreadyLinked: true });
    expect(generateConnectOauthUrl).not.toHaveBeenCalled();
    expect(createHumanInvite).not.toHaveBeenCalled();
    expect(saveConfig).not.toHaveBeenCalled();
    expect(clientFromConfig.mock.results[0]?.value.config.subscriberId).toBe('operator');
    expect(setupHumanRelay).toHaveBeenCalledWith(expect.anything(), {
      subscriberId: 'alice',
      agentIdentifier: 'human-relay',
      defaultVia: 'slack',
    });
  });

  it('issues a Slack authorize URL and skips polling when --async', async () => {
    listAgentIntegrations.mockResolvedValue([slackLink()]);
    hasChannelEndpoint.mockResolvedValue(false);
    generateConnectOauthUrl.mockResolvedValue('https://slack.com/oauth/alice');

    const result = await runInvite('alice', { via: 'slack', async: true });

    expect(result).toEqual({
      humanId: 'alice',
      linkedOn: [],
      alreadyLinked: false,
      url: 'https://slack.com/oauth/alice',
    });
    expect(generateConnectOauthUrl).toHaveBeenCalledWith(expect.anything(), {
      integrationIdentifier: 'slack-1',
      agentIdentifier: 'human-relay',
      subscriberId: 'alice',
    });
    expect(hasChannelEndpoint).toHaveBeenCalledTimes(1);
    expect(createHumanInvite).not.toHaveBeenCalled();
    expect(saveConfig).not.toHaveBeenCalled();
    expect(stdoutText()).toContain('Send this slack link to');
  });

  it('prints the Telegram deep link, waits, and records telegram as the default', async () => {
    listAgentIntegrations.mockResolvedValue([telegramLink(), slackLink()]);
    hasChannelEndpoint.mockResolvedValueOnce(false).mockResolvedValue(true);
    issueTelegramSubscriberLink.mockResolvedValue({ deepLinkUrl: 'https://t.me/bot?start=abc', botUsername: 'bot' });

    const result = await runInvite('bob', { via: 'telegram' });

    expect(result).toEqual({
      humanId: 'bob',
      linkedOn: ['telegram'],
      alreadyLinked: false,
      url: 'https://t.me/bot?start=abc',
    });
    expect(setupHumanRelay).toHaveBeenCalledWith(expect.anything(), {
      subscriberId: 'bob',
      agentIdentifier: 'human-relay',
      defaultVia: 'telegram',
    });
    expect(stdoutText()).toContain('https://t.me/bot?start=abc');
    expect(createHumanInvite).not.toHaveBeenCalled();
  });

  it('forwards --name to the relay setup for chat channels', async () => {
    listAgentIntegrations.mockResolvedValue([telegramLink()]);
    hasChannelEndpoint.mockResolvedValue(true);

    await runInvite('alice', { via: 'telegram', name: 'Alice Chen' });

    expect(setupHumanRelay).toHaveBeenCalledWith(expect.anything(), {
      subscriberId: 'alice',
      agentIdentifier: 'human-relay',
      firstName: 'Alice',
      lastName: 'Chen',
      defaultVia: 'telegram',
    });
  });

  it('forwards --name alongside --email and labels an already-linked email human', async () => {
    listAgentIntegrations.mockResolvedValue([emailLink()]);
    getSubscriberEmail.mockResolvedValue(undefined);

    await runInvite('carol', { via: 'email', email: 'carol@acme.com', name: 'Carol' });
    expect(setupHumanRelay).toHaveBeenCalledWith(expect.anything(), {
      subscriberId: 'carol',
      agentIdentifier: 'human-relay',
      email: 'carol@acme.com',
      firstName: 'Carol',
      defaultVia: 'email',
    });

    setupHumanRelay.mockClear();
    getSubscriberEmail.mockResolvedValue('carol@acme.com');

    const result = await runInvite('carol', { via: 'email', name: 'Carol Diaz' });
    expect(result.alreadyLinked).toBe(true);
    expect(setupHumanRelay).toHaveBeenCalledWith(expect.anything(), {
      subscriberId: 'carol',
      agentIdentifier: 'human-relay',
      firstName: 'Carol',
      lastName: 'Diaz',
      defaultVia: 'email',
    });
  });

  it('records --via email as the default even when already linked without a name', async () => {
    listAgentIntegrations.mockResolvedValue([emailLink()]);
    getSubscriberEmail.mockResolvedValue('carol@acme.com');

    const result = await runInvite('carol', { via: 'email' });

    expect(result).toEqual({ humanId: 'carol', linkedOn: ['email'], alreadyLinked: true });
    expect(setupHumanRelay).toHaveBeenCalledWith(expect.anything(), {
      subscriberId: 'carol',
      agentIdentifier: 'human-relay',
      defaultVia: 'email',
    });
  });

  it('asks for setup when the requested channel is not linked', async () => {
    listAgentIntegrations.mockResolvedValue([telegramLink()]);

    await expect(runInvite('alice', { via: 'slack' })).rejects.toThrow('Run `human setup slack` first');
  });
});

describe('runInvite without --via (invite page)', () => {
  beforeEach(resetMocks);

  it('creates an invite link, prints it, and waits for the first channel they connect', async () => {
    listAgentIntegrations.mockResolvedValue([telegramLink(), slackLink()]);
    hasChannelEndpoint
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockImplementation(
        async (_client: unknown, integrationIdentifier: string) => integrationIdentifier === 'slack-1'
      );
    createHumanInvite.mockResolvedValue(pageInvite());

    const result = await runInvite('alice', { name: 'Alice Chen' });

    expect(createHumanInvite).toHaveBeenCalledWith(expect.anything(), {
      subscriberId: 'alice',
      agentIdentifier: 'human-relay',
      firstName: 'Alice',
      lastName: 'Chen',
    });
    expect(result).toEqual({
      humanId: 'alice',
      linkedOn: ['slack'],
      alreadyLinked: false,
      url: INVITE_URL,
      expiresAt: INVITE_EXPIRES_AT,
    });
    expect(stdoutText()).toContain(INVITE_URL);
    expect(stdoutText()).toContain('they choose how your agent reaches them (telegram or slack)');
    expect(stdoutText()).toContain('pick their default from the same link');
    expect(setupHumanRelay).not.toHaveBeenCalled();
    expect(issueTelegramSubscriberLink).not.toHaveBeenCalled();
    expect(generateConnectOauthUrl).not.toHaveBeenCalled();
  });

  it('does not infer the only linked channel — a sole telegram link still goes through the page', async () => {
    listAgentIntegrations.mockResolvedValue([telegramLink()]);
    hasChannelEndpoint.mockResolvedValue(false);
    createHumanInvite.mockResolvedValue({
      ...pageInvite(),
      channels: [{ via: 'telegram', integrationIdentifier: 'tg-1', connected: false }],
    });

    const result = await runInvite('bob', { async: true });

    expect(result).toEqual({
      humanId: 'bob',
      linkedOn: [],
      alreadyLinked: false,
      url: INVITE_URL,
      expiresAt: INVITE_EXPIRES_AT,
    });
    expect(issueTelegramSubscriberLink).not.toHaveBeenCalled();
    expect(setupHumanRelay).not.toHaveBeenCalled();
  });

  it('returns right away with --async, polling nothing beyond the pre-check', async () => {
    listAgentIntegrations.mockResolvedValue([telegramLink(), slackLink()]);
    hasChannelEndpoint.mockResolvedValue(false);
    createHumanInvite.mockResolvedValue(pageInvite());

    const result = await runInvite('alice', { async: true });

    expect(result.linkedOn).toEqual([]);
    expect(result.url).toBe(INVITE_URL);
    expect(hasChannelEndpoint).toHaveBeenCalledTimes(2);
  });

  it('keeps the channels they already connected and offers the rest', async () => {
    listAgentIntegrations.mockResolvedValue([telegramLink(), slackLink()]);
    hasChannelEndpoint.mockImplementation(
      async (_client: unknown, integrationIdentifier: string) => integrationIdentifier === 'tg-1'
    );
    createHumanInvite.mockResolvedValue(pageInvite({ telegram: true }));

    const result = await runInvite('alice', { async: true });

    expect(result.linkedOn).toEqual(['telegram']);
    expect(stdoutText()).toContain('already connected on telegram; the link lets them add slack');
  });

  it('short-circuits without creating a link when they are connected on every channel', async () => {
    listAgentIntegrations.mockResolvedValue([telegramLink(), slackLink(), emailLink()]);
    hasChannelEndpoint.mockResolvedValue(true);

    const result = await runInvite('alice', { name: 'Alice Chen' });

    expect(result).toEqual({ humanId: 'alice', linkedOn: ['telegram', 'slack'], alreadyLinked: true });
    expect(createHumanInvite).not.toHaveBeenCalled();
    expect(stdoutText()).toContain('alice is already connected on telegram and slack.');
    expect(setupHumanRelay).toHaveBeenCalledWith(expect.anything(), {
      subscriberId: 'alice',
      agentIdentifier: 'human-relay',
      firstName: 'Alice',
      lastName: 'Chen',
    });
  });

  it('asks for Telegram or Slack setup when the relay has neither', async () => {
    listAgentIntegrations.mockResolvedValue([emailLink()]);

    await expect(runInvite('alice', {})).rejects.toThrow(
      'No Telegram or Slack channel is linked to the relay agent. Run `human setup telegram` or `human setup slack` first.'
    );
    expect(createHumanInvite).not.toHaveBeenCalled();
  });
});
