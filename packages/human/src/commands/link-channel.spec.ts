import { afterEach, describe, expect, it, vi } from 'vitest';
import { type HumanApiClient, HumanApiError } from '../api/client';
import type { AgentIntegrationLink } from '../api/setup';
import { DEFAULT_API_URL, HUMAN_SETUP_PAGE_ORIGIN } from '../config';

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
    expect(viaForProviderId('novu-email-agent')).toBe('email');
    expect(viaForProviderId('novu-email')).toBe('email');
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

describe('isMissingBotTokenError', () => {
  it('matches only the 422 "bot token is missing" response', () => {
    expect(isMissingBotTokenError(new HumanApiError('Telegram bot token is missing', 422, 'POST x', {}))).toBe(true);
    expect(isMissingBotTokenError(new HumanApiError('Telegram bot token is missing', 404, 'POST x', {}))).toBe(false);
    expect(isMissingBotTokenError(new HumanApiError('Something else', 422, 'POST x', {}))).toBe(false);
    expect(isMissingBotTokenError(new Error('bot token is missing'))).toBe(false);
  });
});

describe('buildSetupPageUrl', () => {
  it('puts the token in the fragment of the human.md page for Novu Cloud', () => {
    expect(buildSetupPageUrl(DEFAULT_API_URL, 'telegram', 'tok_123', 'https://dash/fallback')).toBe(
      `${HUMAN_SETUP_PAGE_ORIGIN}/connect#tok_123`
    );
    expect(buildSetupPageUrl(`${DEFAULT_API_URL}/`, 'telegram', 'tok_123', 'https://dash/fallback')).toBe(
      `${HUMAN_SETUP_PAGE_ORIGIN}/connect#tok_123`
    );
  });

  it('selects the channel with a query parameter so the token stays in the fragment', () => {
    expect(buildSetupPageUrl(DEFAULT_API_URL, 'slack', 'tok_123', 'https://dash/fallback')).toBe(
      `${HUMAN_SETUP_PAGE_ORIGIN}/connect?channel=slack#tok_123`
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

  it('reports a timeout when the human never finishes', async () => {
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

  it('reports a timeout when the human never finishes', async () => {
    mockedSlackStatus.mockResolvedValue({ valid: true });

    await expect(waitForSlackSetupPage(client, 'tok', { intervalMs: 1, timeoutMs: 20 })).resolves.toBe('timeout');
  });
});

describe('waitForAnyEndpoint', () => {
  const client = {} as HumanApiClient;

  afterEach(() => {
    vi.useRealTimers();
    hasChannelEndpoint.mockReset();
  });

  it('returns the integration the human connected on', async () => {
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
