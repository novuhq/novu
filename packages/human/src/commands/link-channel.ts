import { type HumanApiClient, HumanApiError } from '../api/client';
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

export function inferViaFromLinks(links: AgentIntegrationLink[]): HumanChannel | null {
  const unique = new Set<HumanChannel>();

  for (const link of links) {
    if (link.integration.active === false) {
      continue;
    }

    const via = viaForProviderId(link.integration.providerId);
    if (via) {
      unique.add(via);
    }
  }

  if (unique.size !== 1) {
    return null;
  }

  return [...unique][0] ?? null;
}

export function linkedVias(links: AgentIntegrationLink[]): HumanChannel[] {
  const unique: HumanChannel[] = [];
  const seen = new Set<HumanChannel>();

  for (const link of links) {
    if (link.integration.active === false) {
      continue;
    }

    const via = viaForProviderId(link.integration.providerId);
    if (!via || seen.has(via)) {
      continue;
    }

    seen.add(via);
    unique.push(via);
  }

  return unique;
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
