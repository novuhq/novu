import { beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import type { CliConfig } from '../config';

const listAgentIntegrations = vi.fn();
const hasChannelEndpoint = vi.fn();
const generateConnectOauthUrl = vi.fn();
const issueTelegramSubscriberLink = vi.fn();
const setupRelay = vi.fn();
const createInvite = vi.fn();
const getContact = vi.fn();
const listContacts = vi.fn();
const requestAddressVerification = vi.fn();
const saveConfig = vi.fn();
const clientFromConfig = vi.fn();

vi.mock('../api/setup', () => ({
  listAgentIntegrations: (...args: unknown[]) => listAgentIntegrations(...args),
  hasChannelEndpoint: (...args: unknown[]) => hasChannelEndpoint(...args),
  generateConnectOauthUrl: (...args: unknown[]) => generateConnectOauthUrl(...args),
  issueTelegramSubscriberLink: (...args: unknown[]) => issueTelegramSubscriberLink(...args),
}));

vi.mock('../api/agent-inbox', () => ({
  setupRelay: (...args: unknown[]) => setupRelay(...args),
  createInvite: (...args: unknown[]) => createInvite(...args),
  getContact: (...args: unknown[]) => getContact(...args),
  listContacts: async (...args: unknown[]) => (await listContacts(...args)) ?? { data: [], next: null },
  requestAddressVerification: (...args: unknown[]) => requestAddressVerification(...args),
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

const { formatChannels, parseInviteContactId, resolveInviteVia, runInvite, splitName } = await import('./invite');

const operatorConfig: CliConfig = {
  apiUrl: 'https://api.novu.co',
  auth: { mode: 'apiKey', secretKey: 'key' },
  relayAgentIdentifier: 'human-relay',
  subscriberId: 'operator',
};

const INVITE_URL = 'https://gethuman.md/invite/tok_123';
const INVITE_EXPIRES_AT = '2026-10-02T12:00:00.000Z';
/** `requestedAt` the API returns for the verification the CLI just sent. */
const REQUESTED_AT = '2026-10-01T12:00:00.000Z';

function slackLink() {
  return { integration: { identifier: 'slack-1', providerId: 'slack', active: true } };
}

function telegramLink() {
  return { integration: { identifier: 'tg-1', providerId: 'telegram', active: true } };
}

function emailLink() {
  return { integration: { identifier: 'email-1', providerId: 'agent-email-inbox', active: true } };
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
  setupRelay.mockReset();
  createInvite.mockReset();
  getContact.mockReset();
  listContacts.mockReset();
  requestAddressVerification.mockReset();
  saveConfig.mockReset();
  clientFromConfig.mockReset();
  clientFromConfig.mockReturnValue({
    client: { axios: {} },
    config: { ...operatorConfig },
  });
  setupRelay.mockResolvedValue({
    agentId: 'agent-1',
    agentIdentifier: 'human-relay',
    subscriberId: 'alice',
  });
  getContact.mockRejectedValue(new Error('not found'));
  requestAddressVerification.mockResolvedValue({
    address: 'c***@acme.com',
    requestedAt: REQUESTED_AT,
    expiresAt: '2026-10-02T12:00:00.000Z',
    retryAfterSeconds: 60,
  });
}

describe('parseInviteContactId', () => {
  it('trims a single contact id and rejects lists', () => {
    expect(parseInviteContactId(' alice ')).toBe('alice');
    expect(() => parseInviteContactId('  ')).toThrow('Pass the contact to invite');
    expect(() => parseInviteContactId('alice,bob')).toThrow('one person at a time');
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

  it('never infers a channel without --via — the invite page lets the person pick', () => {
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

    expect(result).toEqual({ contactId: 'alice', linkedOn: ['slack'], alreadyLinked: true });
    expect(generateConnectOauthUrl).not.toHaveBeenCalled();
    expect(createInvite).not.toHaveBeenCalled();
    expect(saveConfig).not.toHaveBeenCalled();
    expect(clientFromConfig.mock.results[0]?.value.config.subscriberId).toBe('operator');
    expect(setupRelay).toHaveBeenCalledWith(expect.anything(), {
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
      contactId: 'alice',
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
    expect(createInvite).not.toHaveBeenCalled();
    expect(saveConfig).not.toHaveBeenCalled();
    expect(stdoutText()).toContain('Send this slack link to');
  });

  it('prints the Telegram deep link, waits, and records telegram as the default', async () => {
    listAgentIntegrations.mockResolvedValue([telegramLink(), slackLink()]);
    hasChannelEndpoint.mockResolvedValueOnce(false).mockResolvedValue(true);
    issueTelegramSubscriberLink.mockResolvedValue({ deepLinkUrl: 'https://t.me/bot?start=abc', botUsername: 'bot' });

    const result = await runInvite('bob', { via: 'telegram' });

    expect(result).toEqual({
      contactId: 'bob',
      linkedOn: ['telegram'],
      alreadyLinked: false,
      url: 'https://t.me/bot?start=abc',
    });
    expect(setupRelay).toHaveBeenCalledWith(expect.anything(), {
      subscriberId: 'bob',
      agentIdentifier: 'human-relay',
      defaultVia: 'telegram',
    });
    expect(stdoutText()).toContain('https://t.me/bot?start=abc');
    expect(createInvite).not.toHaveBeenCalled();
  });

  it('forwards --name to the relay setup for chat channels', async () => {
    listAgentIntegrations.mockResolvedValue([telegramLink()]);
    hasChannelEndpoint.mockResolvedValue(true);

    await runInvite('alice', { via: 'telegram', name: 'Alice Chen' });

    expect(setupRelay).toHaveBeenCalledWith(expect.anything(), {
      subscriberId: 'alice',
      agentIdentifier: 'human-relay',
      firstName: 'Alice',
      lastName: 'Chen',
      defaultVia: 'telegram',
    });
  });

  it('sends a verification email and polls until verified', async () => {
    listAgentIntegrations.mockResolvedValue([emailLink()]);
    getContact
      .mockRejectedValueOnce(new Error('not found'))
      .mockResolvedValueOnce({
        id: 'carol',
        channels: [{ via: 'email', status: 'pending', address: 'c***@acme.com' }],
      })
      .mockResolvedValue({
        id: 'carol',
        channels: [{ via: 'email', status: 'verified', address: 'c***@acme.com', verifiedRequestedAt: REQUESTED_AT }],
      });

    const result = await runInvite('carol', { via: 'email', email: 'carol@acme.com', name: 'Carol' });

    expect(requestAddressVerification).toHaveBeenCalledWith(expect.anything(), {
      subscriberId: 'carol',
      agentIdentifier: 'human-relay',
      via: 'email',
      address: 'carol@acme.com',
      firstName: 'Carol',
    });
    expect(result).toEqual({ contactId: 'carol', linkedOn: ['email'], alreadyLinked: false });
  });

  it('short-circuits when email is already verified', async () => {
    listAgentIntegrations.mockResolvedValue([emailLink()]);
    getContact.mockResolvedValue({
      id: 'carol',
      email: 'carol@acme.com',
      channels: [{ via: 'email', status: 'verified', address: 'c***@acme.com' }],
    });

    const result = await runInvite('carol', { via: 'email', name: 'Carol Diaz' });

    expect(result.alreadyLinked).toBe(true);
    expect(requestAddressVerification).not.toHaveBeenCalled();
    expect(setupRelay).toHaveBeenCalledWith(expect.anything(), {
      subscriberId: 'carol',
      agentIdentifier: 'human-relay',
      firstName: 'Carol',
      lastName: 'Diaz',
      defaultVia: 'email',
    });
  });

  it('keeps waiting until the link it sent is the one that got verified, even when masks collide', async () => {
    listAgentIntegrations.mockResolvedValue([emailLink()]);
    const olderRequest = '2026-09-30T12:00:00.000Z';
    let reads = 0;
    getContact.mockImplementation(async () => {
      reads += 1;
      if (reads === 1) {
        // carol@acme.com is already verified from an earlier request.
        return {
          id: 'carol',
          channels: [{ via: 'email', status: 'verified', address: 'c***@acme.com', verifiedRequestedAt: olderRequest }],
        };
      }
      if (reads === 2) {
        // Our chris@acme.com request is pending; the old address still shows verified with the same mask.
        return {
          id: 'carol',
          channels: [
            {
              via: 'email',
              status: 'verified',
              address: 'c***@acme.com',
              verifiedRequestedAt: olderRequest,
              requestedAt: REQUESTED_AT,
            },
          ],
        };
      }

      return {
        id: 'carol',
        channels: [{ via: 'email', status: 'verified', address: 'c***@acme.com', verifiedRequestedAt: REQUESTED_AT }],
      };
    });
    requestAddressVerification.mockResolvedValue({
      address: 'c***@acme.com',
      requestedAt: REQUESTED_AT,
      expiresAt: '2026-10-02T12:00:00.000Z',
      retryAfterSeconds: 60,
      replacesVerifiedAddress: true,
    });

    const result = await runInvite('carol', { via: 'email', email: 'chris@acme.com' });

    expect(result).toEqual({ contactId: 'carol', linkedOn: ['email'], alreadyLinked: false });
    expect(reads).toBeGreaterThanOrEqual(3);
  });

  it('warns from the API when a different address is already verified', async () => {
    listAgentIntegrations.mockResolvedValue([emailLink()]);
    getContact.mockResolvedValue({
      id: 'carol',
      channels: [{ via: 'email', status: 'verified', address: 'c***@acme.com' }],
    });
    requestAddressVerification.mockResolvedValue({
      address: 'n***@acme.com',
      requestedAt: REQUESTED_AT,
      expiresAt: '2026-10-02T12:00:00.000Z',
      retryAfterSeconds: 60,
      replacesVerifiedAddress: true,
    });

    const result = await runInvite('carol', { via: 'email', email: 'new@acme.com', async: true });

    expect(result.alreadyLinked).toBe(false);
    expect(stdoutText()).toContain('A different address is already verified');
  });

  it('does not send again when the address given is the one already verified', async () => {
    listAgentIntegrations.mockResolvedValue([emailLink()]);
    getContact.mockResolvedValue({
      id: 'carol',
      channels: [{ via: 'email', status: 'verified', address: 'c***@acme.com' }],
    });
    listContacts.mockResolvedValue({
      data: [{ id: 'carol', channels: [{ via: 'email', status: 'verified', address: 'carol@acme.com' }] }],
      next: null,
    });

    const result = await runInvite('carol', { via: 'email', email: 'carol@acme.com', async: true });

    expect(result).toEqual({ contactId: 'carol', linkedOn: ['email'], alreadyLinked: true });
    expect(requestAddressVerification).not.toHaveBeenCalled();
  });

  it('returns immediately with --async after sending the verification email', async () => {
    listAgentIntegrations.mockResolvedValue([emailLink()]);
    getContact.mockRejectedValue(new Error('not found'));

    const result = await runInvite('carol', { via: 'email', email: 'carol@acme.com', async: true });

    expect(result).toEqual({ contactId: 'carol', linkedOn: [], alreadyLinked: false });
    expect(requestAddressVerification).toHaveBeenCalled();
  });

  it('asks for setup when the requested channel is not linked', async () => {
    listAgentIntegrations.mockResolvedValue([telegramLink()]);

    await expect(runInvite('alice', { via: 'slack' })).rejects.toThrow(
      'Run `npx @agentinbox/cli channel add slack` first'
    );
  });
});

describe('runInvite without --via (invite page)', () => {
  beforeEach(resetMocks);

  it('creates an invite link, prints it, and waits for the first channel they connect', async () => {
    listAgentIntegrations.mockResolvedValue([telegramLink(), slackLink()]);
    hasChannelEndpoint.mockResolvedValue(false);
    getContact.mockResolvedValue({
      id: 'alice',
      channels: [
        { via: 'telegram', status: 'unverified' },
        { via: 'slack', status: 'verified' },
      ],
    });
    createInvite.mockResolvedValue(pageInvite());

    const result = await runInvite('alice', { name: 'Alice Chen' });

    expect(createInvite).toHaveBeenCalledWith(expect.anything(), {
      subscriberId: 'alice',
      agentIdentifier: 'human-relay',
      firstName: 'Alice',
      lastName: 'Chen',
    });
    expect(result).toEqual({
      contactId: 'alice',
      linkedOn: ['slack'],
      alreadyLinked: false,
      url: INVITE_URL,
      expiresAt: INVITE_EXPIRES_AT,
    });
    expect(stdoutText()).toContain(INVITE_URL);
    expect(stdoutText()).toContain('they choose how your agent reaches them (telegram or slack)');
    expect(stdoutText()).toContain('pick their default from the same link');
    expect(setupRelay).not.toHaveBeenCalled();
    expect(issueTelegramSubscriberLink).not.toHaveBeenCalled();
    expect(generateConnectOauthUrl).not.toHaveBeenCalled();
  });

  it('does not infer the only linked channel — a sole telegram link still goes through the page', async () => {
    listAgentIntegrations.mockResolvedValue([telegramLink()]);
    hasChannelEndpoint.mockResolvedValue(false);
    createInvite.mockResolvedValue({
      ...pageInvite(),
      channels: [{ via: 'telegram', integrationIdentifier: 'tg-1', connected: false }],
    });

    const result = await runInvite('bob', { async: true });

    expect(result).toEqual({
      contactId: 'bob',
      linkedOn: [],
      alreadyLinked: false,
      url: INVITE_URL,
      expiresAt: INVITE_EXPIRES_AT,
    });
    expect(issueTelegramSubscriberLink).not.toHaveBeenCalled();
    expect(setupRelay).not.toHaveBeenCalled();
  });

  it('returns right away with --async, polling nothing beyond the pre-check', async () => {
    listAgentIntegrations.mockResolvedValue([telegramLink(), slackLink()]);
    hasChannelEndpoint.mockResolvedValue(false);
    createInvite.mockResolvedValue(pageInvite());

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
    createInvite.mockResolvedValue(pageInvite({ telegram: true }));

    const result = await runInvite('alice', { async: true });

    expect(result.linkedOn).toEqual(['telegram']);
    expect(stdoutText()).toContain('already connected on telegram; the link lets them add slack');
  });

  it('short-circuits without creating a link when they are connected on every channel', async () => {
    listAgentIntegrations.mockResolvedValue([telegramLink(), slackLink(), emailLink()]);
    hasChannelEndpoint.mockResolvedValue(true);
    getContact.mockResolvedValue({
      id: 'alice',
      channels: [{ via: 'email', status: 'verified', address: 'a***@acme.com' }],
    });

    const result = await runInvite('alice', { name: 'Alice Chen' });

    expect(result).toEqual({
      contactId: 'alice',
      linkedOn: ['telegram', 'slack', 'email'],
      alreadyLinked: true,
    });
    expect(createInvite).not.toHaveBeenCalled();
    expect(stdoutText()).toContain('alice is already connected on telegram, slack and email.');
    expect(setupRelay).toHaveBeenCalledWith(expect.anything(), {
      subscriberId: 'alice',
      agentIdentifier: 'human-relay',
      firstName: 'Alice',
      lastName: 'Chen',
    });
  });

  it('offers an invite page when only email is linked', async () => {
    listAgentIntegrations.mockResolvedValue([emailLink()]);
    getContact.mockResolvedValue({
      id: 'alice',
      channels: [{ via: 'email', status: 'unverified' }],
    });
    createInvite.mockResolvedValue({
      url: INVITE_URL,
      expiresAt: INVITE_EXPIRES_AT,
      channels: [{ via: 'email', integrationIdentifier: 'email-1', connected: false }],
    });

    const result = await runInvite('alice', { async: true });

    expect(createInvite).toHaveBeenCalled();
    expect(result.url).toBe(INVITE_URL);
    expect(stdoutText()).toContain('email');
  });

  it('asks for channel setup when the relay has none linked', async () => {
    listAgentIntegrations.mockResolvedValue([]);

    await expect(runInvite('alice', {})).rejects.toThrow(
      'No Telegram, Slack, or Email channel is connected yet. Run `npx @agentinbox/cli setup` first.'
    );
    expect(createInvite).not.toHaveBeenCalled();
  });
});
