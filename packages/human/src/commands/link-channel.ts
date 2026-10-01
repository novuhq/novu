import { type HumanApiClient, HumanApiError } from '../api/client';
import { getContact } from '../api/human';
import {
  type AgentIntegrationLink,
  generateConnectOauthUrl,
  hasChannelEndpoint,
  issueTelegramSubscriberLink,
} from '../api/setup';
import { pollUntil, sleep } from '../poll';

export const HUMAN_CHANNELS = ['telegram', 'slack', 'email'] as const;
export type HumanChannel = (typeof HUMAN_CHANNELS)[number];

export const CHANNEL_POLL_INTERVAL_MS = 2_000;
export const CHANNEL_POLL_TIMEOUT_MS = 5 * 60_000;
export const CREDENTIAL_PROPAGATION_TIMEOUT_MS = 30_000;

export function isHumanChannel(value: string): value is HumanChannel {
  return (HUMAN_CHANNELS as readonly string[]).includes(value);
}

export function viaForProviderId(providerId: string): HumanChannel | null {
  switch (providerId) {
    case 'telegram':
      return 'telegram';
    case 'slack':
    case 'novu-slack':
      return 'slack';
    case 'novu-email-agent':
    case 'novu-email':
      return 'email';
    default:
      return null;
  }
}

export function providerIdsForVia(via: HumanChannel): readonly string[] {
  switch (via) {
    case 'telegram':
      return ['telegram'];
    case 'slack':
      return ['slack', 'novu-slack'];
    case 'email':
      return ['novu-email-agent', 'novu-email'];
    default: {
      const exhaustive: never = via;

      return exhaustive;
    }
  }
}

export function findLinkedIntegration(
  links: AgentIntegrationLink[],
  via: HumanChannel
): AgentIntegrationLink | undefined {
  const ids = new Set(providerIdsForVia(via));

  return links.find((link) => link.integration.active !== false && ids.has(link.integration.providerId));
}

export function parseEmailAddress(value: string): string | null {
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return null;
  }

  return email;
}

export function isMissingSlackCredentialsError(err: unknown): boolean {
  return err instanceof HumanApiError && err.status === 404 && /missing credentials/i.test(err.message);
}

export async function waitForEndpoint(
  client: HumanApiClient,
  integrationIdentifier: string,
  subscriberId: string,
  waitingFor: string,
  timeoutHint = 'Re-run `human setup` to continue.'
): Promise<void> {
  const connected = await pollUntil(
    async () => ((await hasChannelEndpoint(client, integrationIdentifier, subscriberId)) ? 'done' : 'pending'),
    { intervalMs: CHANNEL_POLL_INTERVAL_MS, timeoutMs: CHANNEL_POLL_TIMEOUT_MS }
  );

  if (!connected) {
    throw new Error(
      `We didn't see ${waitingFor} within ${Math.round(CHANNEL_POLL_TIMEOUT_MS / 1000)}s. ${timeoutHint}`
    );
  }
}

/**
 * Polls contact channel status until one of `vias` is verified. Chat and email
 * share this — both report `verified` on `getContact`.
 */
export async function waitForVerifiedChannels(
  client: HumanApiClient,
  subscriberId: string,
  agentIdentifier: string | undefined,
  vias: readonly HumanChannel[],
  waitingFor: string,
  timeoutHint: string
): Promise<HumanChannel> {
  const found: { via?: HumanChannel } = {};

  await pollUntil(
    async () => {
      try {
        const contact = await getContact(client, subscriberId, agentIdentifier);
        const match = contact.channels?.find(
          (channel) => isHumanChannel(channel.via) && vias.includes(channel.via) && channel.status === 'verified'
        );
        if (match && isHumanChannel(match.via)) {
          found.via = match.via;

          return 'done';
        }
      } catch {
        // The contact row may not exist until the first channel lands.
      }

      return 'pending';
    },
    { intervalMs: CHANNEL_POLL_INTERVAL_MS, timeoutMs: CHANNEL_POLL_TIMEOUT_MS }
  );

  if (!found.via) {
    throw new Error(
      `We didn't see ${waitingFor} within ${Math.round(CHANNEL_POLL_TIMEOUT_MS / 1000)}s. ${timeoutHint}`
    );
  }

  return found.via;
}

/**
 * Polls until the verified email is `expectedMaskedAddress` and no newer
 * request is still pending. A previously verified address stays `verified`
 * while a replacement is pending, so status alone would resolve too early.
 */
export async function waitForVerifiedEmail(
  client: HumanApiClient,
  subscriberId: string,
  agentIdentifier: string | undefined,
  expectedMaskedAddress: string,
  waitingFor: string,
  timeoutHint: string
): Promise<void> {
  const confirmed = await pollUntil(
    async () => {
      try {
        const contact = await getContact(client, subscriberId, agentIdentifier);
        const channel = contact.channels?.find((item) => item.via === 'email');
        if (channel?.status === 'verified' && channel.address === expectedMaskedAddress && !channel.requestedAt) {
          return 'done';
        }
      } catch {
        // The contact row may not exist until the verification lands.
      }

      return 'pending';
    },
    { intervalMs: CHANNEL_POLL_INTERVAL_MS, timeoutMs: CHANNEL_POLL_TIMEOUT_MS }
  );

  if (!confirmed) {
    throw new Error(
      `We didn't see ${waitingFor} within ${Math.round(CHANNEL_POLL_TIMEOUT_MS / 1000)}s. ${timeoutHint}`
    );
  }
}

/**
 * Invite-page counterpart of {@link waitForEndpoint}: resolves with the first
 * integration the human connects on, out of several they could pick from.
 */
export async function waitForAnyEndpoint(
  client: HumanApiClient,
  integrationIdentifiers: string[],
  subscriberId: string,
  waitingFor: string,
  timeoutHint: string
): Promise<string> {
  const found: { integrationIdentifier?: string } = {};

  await pollUntil(
    async () => {
      for (const integrationIdentifier of integrationIdentifiers) {
        if (await hasChannelEndpoint(client, integrationIdentifier, subscriberId)) {
          found.integrationIdentifier = integrationIdentifier;

          return 'done';
        }
      }

      return 'pending';
    },
    { intervalMs: CHANNEL_POLL_INTERVAL_MS, timeoutMs: CHANNEL_POLL_TIMEOUT_MS }
  );

  if (!found.integrationIdentifier) {
    throw new Error(
      `We didn't see ${waitingFor} within ${Math.round(CHANNEL_POLL_TIMEOUT_MS / 1000)}s. ${timeoutHint}`
    );
  }

  return found.integrationIdentifier;
}

export async function issueTelegramSubscriberLinkWithRetry(
  client: HumanApiClient,
  integrationIdentifier: string,
  subscriberId: string
): Promise<{ deepLinkUrl: string; botUsername: string }> {
  const deadline = Date.now() + CREDENTIAL_PROPAGATION_TIMEOUT_MS;

  while (true) {
    try {
      return await issueTelegramSubscriberLink(client, integrationIdentifier, subscriberId);
    } catch (err) {
      const retryable = err instanceof HumanApiError && err.status === 422 && /bot token is missing/i.test(err.message);
      if (!retryable || Date.now() >= deadline) {
        throw err;
      }

      await sleep(2_000);
    }
  }
}

export async function generateSlackUserOauthUrl(
  client: HumanApiClient,
  input: { integrationIdentifier: string; agentIdentifier: string; subscriberId: string }
): Promise<string> {
  try {
    return await generateConnectOauthUrl(client, input);
  } catch (err) {
    if (isMissingSlackCredentialsError(err)) {
      throw new Error('No slack channel is linked with credentials. Run `human setup slack` first.');
    }

    throw err;
  }
}
