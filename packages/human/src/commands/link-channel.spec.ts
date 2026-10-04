import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HumanApiClient } from '../api/client';
import type { AgentIntegrationLink } from '../api/setup';

const { hasChannelEndpoint } = vi.hoisted(() => ({ hasChannelEndpoint: vi.fn() }));

vi.mock('../api/setup', () => ({
  hasChannelEndpoint,
  generateConnectOauthUrl: vi.fn(),
  issueTelegramSubscriberLink: vi.fn(),
}));

import {
  CHANNEL_POLL_INTERVAL_MS,
  CHANNEL_POLL_TIMEOUT_MS,
  findLinkedIntegration,
  parseEmailAddress,
  viaForProviderId,
  waitForAnyEndpoint,
} from './link-channel';

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
