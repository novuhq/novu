import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HumanCliConfig } from '../config';

const listAgentIntegrations = vi.fn();
const hasChannelEndpoint = vi.fn();
const generateConnectOauthUrl = vi.fn();
const issueTelegramSubscriberLink = vi.fn();
const getSubscriberEmail = vi.fn();
const setupHumanRelay = vi.fn();
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

const { parseInviteHumanId, resolveInviteVia, runInvite, splitName } = await import('./invite');

const operatorConfig: HumanCliConfig = {
  apiUrl: 'https://api.novu.co',
  auth: { mode: 'apiKey', secretKey: 'key' },
  relayAgentIdentifier: 'human-relay',
  subscriberId: 'operator',
};

function slackLink() {
  return { integration: { identifier: 'slack-1', providerId: 'slack', active: true } };
}

function telegramLink() {
  return { integration: { identifier: 'tg-1', providerId: 'telegram', active: true } };
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
  it('uses --via when provided', () => {
    expect(resolveInviteVia([slackLink(), telegramLink()], 'Slack')).toBe('slack');
  });

  it('infers the sole linked channel', () => {
    expect(resolveInviteVia([telegramLink()])).toBe('telegram');
  });

  it('requires --via when several channels are linked', () => {
    expect(() => resolveInviteVia([slackLink(), telegramLink()])).toThrow('--via');
  });

  it('tells the caller to run setup when nothing is linked', () => {
    expect(() => resolveInviteVia([])).toThrow('human setup');
  });
});

describe('runInvite', () => {
  beforeEach(() => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    listAgentIntegrations.mockReset();
    hasChannelEndpoint.mockReset();
    generateConnectOauthUrl.mockReset();
    issueTelegramSubscriberLink.mockReset();
    getSubscriberEmail.mockReset();
    setupHumanRelay.mockReset();
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
  });

  it('short-circuits when the invitee is already linked and does not change local identity', async () => {
    listAgentIntegrations.mockResolvedValue([slackLink()]);
    hasChannelEndpoint.mockResolvedValue(true);

    const result = await runInvite('alice', { via: 'slack' });

    expect(result).toEqual({ humanId: 'alice', via: 'slack', alreadyLinked: true });
    expect(generateConnectOauthUrl).not.toHaveBeenCalled();
    expect(saveConfig).not.toHaveBeenCalled();
    expect(clientFromConfig.mock.results[0]?.value.config.subscriberId).toBe('operator');
    expect(setupHumanRelay).toHaveBeenCalledWith(expect.anything(), {
      subscriberId: 'alice',
      agentIdentifier: 'human-relay',
    });
  });

  it('issues a Slack authorize URL and skips polling when --async', async () => {
    listAgentIntegrations.mockResolvedValue([slackLink()]);
    hasChannelEndpoint.mockResolvedValue(false);
    generateConnectOauthUrl.mockResolvedValue('https://slack.com/oauth/alice');

    const result = await runInvite('alice', { via: 'slack', async: true });

    expect(result).toEqual({
      humanId: 'alice',
      via: 'slack',
      alreadyLinked: false,
      url: 'https://slack.com/oauth/alice',
    });
    expect(generateConnectOauthUrl).toHaveBeenCalledWith(expect.anything(), {
      integrationIdentifier: 'slack-1',
      agentIdentifier: 'human-relay',
      subscriberId: 'alice',
    });
    expect(hasChannelEndpoint).toHaveBeenCalledTimes(1);
    expect(saveConfig).not.toHaveBeenCalled();
  });

  it('infers telegram when it is the only linked channel', async () => {
    listAgentIntegrations.mockResolvedValue([telegramLink()]);
    hasChannelEndpoint.mockResolvedValue(true);

    const result = await runInvite('bob', { async: true });

    expect(result.via).toBe('telegram');
    expect(hasChannelEndpoint).toHaveBeenCalledWith(expect.anything(), 'tg-1', 'bob');
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
    });
  });

  it('forwards --name alongside --email and labels an already-linked email human', async () => {
    listAgentIntegrations.mockResolvedValue([
      { integration: { identifier: 'email-1', providerId: 'novu-email-agent', active: true } },
    ]);
    getSubscriberEmail.mockResolvedValue(undefined);

    await runInvite('carol', { via: 'email', email: 'carol@acme.com', name: 'Carol' });
    expect(setupHumanRelay).toHaveBeenCalledWith(expect.anything(), {
      subscriberId: 'carol',
      agentIdentifier: 'human-relay',
      email: 'carol@acme.com',
      firstName: 'Carol',
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
    });
  });
});
