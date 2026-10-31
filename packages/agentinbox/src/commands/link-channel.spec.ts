import { afterEach, describe, expect, it, vi } from 'vitest';
import { type ApiClient, ApiError } from '../api/client';
import type { AgentIntegrationLink } from '../api/setup';
import { DEFAULT_API_URL, SETUP_PAGE_ORIGIN } from '../config';

const { getSlackSetupLinkStatus, getTelegramMobileLinkStatus, hasChannelEndpoint } = vi.hoisted(() => ({
  getSlackSetupLinkStatus: vi.fn(),
  getTelegramMobileLinkStatus: vi.fn(),
  hasChannelEndpoint: vi.fn(),
}));

vi.mock('../api/setup', () => ({
  getSlackSetupLinkStatus,
  getTelegramMobileLinkStatus,
  hasChannelEndpoint,
  generateConnectOauthUrl: vi.fn(),
  issueTelegramSubscriberLink: vi.fn(),
}));

import {
  buildSetupPageUrl,
  CHANNEL_POLL_INTERVAL_MS,
  CHANNEL_POLL_TIMEOUT_MS,
  findLinkedIntegration,
  isEmailVerified,
  isMissingBotTokenError,
  parseEmailAddress,
  viaForProviderId,
  waitForAnyEndpoint,
  waitForSlackSetupPage,
  waitForTelegramSetupPage,
} from './link-channel';

const mockedStatus = getTelegramMobileLinkStatus;
const mockedSlackStatus = getSlackSetupLinkStatus;
const client = { apiUrl: DEFAULT_API_URL } as never;

function link(providerId: string, identifier = providerId, active = true): AgentIntegrationLink {
  return { integration: { identifier, providerId, active } };
}

describe('viaForProviderId', () => {
  it('maps known provider ids onto human channels', () => {
    expect(viaForProviderId('telegram')).toBe('telegram');
    expect(viaForProviderId('slack')).toBe('slack');
    expect(viaForProviderId('novu-slack')).toBe('slack');
    expect(viaForProviderId('agent-email-inbox')).toBe('email');
    expect(viaForProviderId('novu-email-agent')).toBe(null);
    expect(viaForProviderId('whatsapp-business')).toBeNull();
  });
});

describe('findLinkedIntegration', () => {
  it('picks the integration for the requested channel', () => {
    const links = [link('telegram', 'tg-1'), link('slack', 'sl-1')];

    expect(findLinkedIntegration(links, 'slack')?.integration.identifier).toBe('sl-1');
    expect(findLinkedIntegration(links, 'email')).toBeUndefined();
  });

  it('skips inactive integrations', () => {
    expect(findLinkedIntegration([link('telegram', 'tg-1', false)], 'telegram')).toBeUndefined();
  });
});

describe('parseEmailAddress', () => {
  it('accepts a trimmed address and rejects junk', () => {
    expect(parseEmailAddress('  Bob@Acme.com ')).toBe('bob@acme.com');
    expect(parseEmailAddress('not-an-email')).toBeNull();
  });
});

describe('isEmailVerified', () => {
  const answers = (contact: Record<string, unknown>) =>
    ({ axios: { get: vi.fn(async () => ({ data: { data: [{ id: 'sub-1', ...contact }], next: null } })) } }) as never;
  const confirmed = (address: string) => answers({ emailVerification: { address, status: 'verified' } });

  it('is true for the address this contact confirmed', async () => {
    await expect(isEmailVerified(confirmed('ada@example.com'), 'sub-1', 'relay', 'ada@example.com')).resolves.toBe(
      true
    );
    await expect(isEmailVerified(confirmed('Ada@Example.com'), 'sub-1', 'relay', 'ada@example.com')).resolves.toBe(
      true
    );
  });

  it('asks about this contact, for this agent', async () => {
    const client = confirmed('ada@example.com');

    await isEmailVerified(client, 'sub-1', 'relay', 'ada@example.com');

    expect((client as unknown as { axios: { get: ReturnType<typeof vi.fn> } }).axios.get).toHaveBeenCalledWith(
      '/v1/contacts',
      { params: { subscriberId: 'sub-1', agentIdentifier: 'relay', limit: 1 } }
    );
  });

  it('is false for an address another agent confirmed, which is the one on the contact', async () => {
    const sharedContact = answers({
      email: 'ada@example.com',
      emailVerification: { address: 'own@example.com', status: 'verified' },
    });

    await expect(isEmailVerified(sharedContact, 'sub-1', 'relay', 'ada@example.com')).resolves.toBe(false);
  });

  it('is false for another address, even one that looks the same once masked', async () => {
    await expect(isEmailVerified(confirmed('adam@example.com'), 'sub-1', 'relay', 'ada@example.com')).resolves.toBe(
      false
    );
  });

  it('is false while the link has not been opened', async () => {
    const pending = answers({ emailVerification: { address: 'ada@example.com', status: 'pending' } });

    await expect(isEmailVerified(pending, 'sub-1', 'relay', 'ada@example.com')).resolves.toBe(false);
  });

  it('is false while the contact does not exist', async () => {
    const missing = { axios: { get: vi.fn().mockRejectedValue(new Error('not found')) } } as never;

    await expect(isEmailVerified(missing, 'sub-1', 'relay', 'ada@example.com')).resolves.toBe(false);
  });
});

describe('isMissingBotTokenError', () => {
  it('matches only the 422 "bot token is missing" response', () => {
    expect(isMissingBotTokenError(new ApiError('Telegram bot token is missing', 422, 'POST x', {}))).toBe(true);
    expect(isMissingBotTokenError(new ApiError('Telegram bot token is missing', 404, 'POST x', {}))).toBe(false);
    expect(isMissingBotTokenError(new ApiError('Something else', 422, 'POST x', {}))).toBe(false);
    expect(isMissingBotTokenError(new Error('bot token is missing'))).toBe(false);
  });
});

describe('buildSetupPageUrl', () => {
  it('puts the token in the fragment of the person.md page for Novu Cloud', () => {
    expect(buildSetupPageUrl(DEFAULT_API_URL, 'telegram', 'tok_123', 'https://dash/fallback')).toBe(
      `${SETUP_PAGE_ORIGIN}/connect#tok_123`
    );
    expect(buildSetupPageUrl(`${DEFAULT_API_URL}/`, 'telegram', 'tok_123', 'https://dash/fallback')).toBe(
      `${SETUP_PAGE_ORIGIN}/connect#tok_123`
    );
  });

  it('selects the channel with a query parameter so the token stays in the fragment', () => {
    expect(buildSetupPageUrl(DEFAULT_API_URL, 'slack', 'tok_123', 'https://dash/fallback')).toBe(
      `${SETUP_PAGE_ORIGIN}/connect?channel=slack#tok_123`
    );
  });

  it('falls back to the server-minted dashboard URL for self-hosted or local APIs', () => {
    expect(buildSetupPageUrl('http://localhost:3000', 'slack', 'tok_123', 'https://dash/fallback')).toBe(
      'https://dash/fallback'
    );
    expect(buildSetupPageUrl('https://api.novu.example.com', 'telegram', 'tok_123', 'https://dash/fallback')).toBe(
      'https://dash/fallback'
    );
  });
});

describe('waitForTelegramSetupPage', () => {
  const fast = { intervalMs: 1, timeoutMs: 200 };

  it('resolves "saved" once the page consumes the token', async () => {
    mockedStatus
      .mockResolvedValueOnce({ valid: true })
      .mockResolvedValueOnce({ valid: true })
      .mockResolvedValueOnce({ valid: false, reason: 'used' });

    await expect(waitForTelegramSetupPage(client, 'tok', fast)).resolves.toBe('saved');
    expect(mockedStatus).toHaveBeenCalledTimes(3);
  });

  it('reports expired and invalid links distinctly', async () => {
    mockedStatus.mockReset();
    mockedStatus.mockResolvedValueOnce({ valid: false, reason: 'expired' });
    await expect(waitForTelegramSetupPage(client, 'tok', fast)).resolves.toBe('expired');

    mockedStatus.mockResolvedValueOnce({ valid: false, reason: 'invalid' });
    await expect(waitForTelegramSetupPage(client, 'tok', fast)).resolves.toBe('invalid');
  });

  it('reports a timeout when the person never finishes', async () => {
    mockedStatus.mockReset();
    mockedStatus.mockResolvedValue({ valid: true });

    await expect(waitForTelegramSetupPage(client, 'tok', { intervalMs: 1, timeoutMs: 20 })).resolves.toBe('timeout');
  });
});

describe('waitForSlackSetupPage', () => {
  const fast = { intervalMs: 1, timeoutMs: 200 };

  it('resolves "saved" once the page consumes the token', async () => {
    mockedSlackStatus.mockResolvedValueOnce({ valid: false, reason: 'used' });

    await expect(waitForSlackSetupPage(client, 'tok', fast)).resolves.toBe('saved');
  });

  it('reports a timeout when the person never finishes', async () => {
    mockedSlackStatus.mockResolvedValue({ valid: true });

    await expect(waitForSlackSetupPage(client, 'tok', { intervalMs: 1, timeoutMs: 20 })).resolves.toBe('timeout');
  });
});

describe('waitForAnyEndpoint', () => {
  const client = {} as ApiClient;

  afterEach(() => {
    vi.useRealTimers();
    hasChannelEndpoint.mockReset();
  });

  it('returns the integration the person connected on', async () => {
    hasChannelEndpoint.mockImplementation(
      async (_client: unknown, integrationIdentifier: string) => integrationIdentifier === 'sl-1'
    );

    await expect(waitForAnyEndpoint(client, ['tg-1', 'sl-1'], 'alice', 'alice connect', 'hint')).resolves.toBe('sl-1');
    expect(hasChannelEndpoint).toHaveBeenCalledWith(client, 'tg-1', 'alice');
  });

  it('keeps polling until one of them connects', async () => {
    vi.useFakeTimers();
    hasChannelEndpoint.mockResolvedValueOnce(false).mockResolvedValueOnce(false).mockResolvedValue(true);

    const connected = waitForAnyEndpoint(client, ['tg-1', 'sl-1'], 'alice', 'alice connect', 'hint');
    await vi.advanceTimersByTimeAsync(CHANNEL_POLL_INTERVAL_MS);

    await expect(connected).resolves.toBe('tg-1');
    expect(hasChannelEndpoint).toHaveBeenCalledTimes(3);
  });

  it('times out with the caller hint', async () => {
    vi.useFakeTimers();
    hasChannelEndpoint.mockResolvedValue(false);

    const connected = waitForAnyEndpoint(
      client,
      ['tg-1'],
      'alice',
      'alice connect telegram',
      'The link keeps working.'
    );
    const assertion = expect(connected).rejects.toThrow(
      "We didn't see alice connect telegram within 300s. The link keeps working."
    );
    await vi.advanceTimersByTimeAsync(CHANNEL_POLL_TIMEOUT_MS + CHANNEL_POLL_INTERVAL_MS);

    await assertion;
  });
});
