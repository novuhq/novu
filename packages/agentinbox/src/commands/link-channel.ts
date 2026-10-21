import { getContact } from '../api/agent-inbox';
import { type ApiClient, ApiError } from '../api/client';
import {
  type AgentIntegrationLink,
  generateConnectOauthUrl,
  getSlackSetupLinkStatus,
  getTelegramMobileLinkStatus,
  hasChannelEndpoint,
  issueTelegramSubscriberLink,
} from '../api/setup';
import { DEFAULT_API_URL, SETUP_PAGE_ORIGIN } from '../config';
import { pollUntil, sleep } from '../poll';

export const CHANNEL_NAMES = ['telegram', 'slack', 'email'] as const;
export type ChannelName = (typeof CHANNEL_NAMES)[number];

/** The channels that need a connect dance. Email is verified on the inbox instead. */
export type ChatChannel = Exclude<ChannelName, 'email'>;

export const CHANNEL_POLL_INTERVAL_MS = 2_000;
export const CHANNEL_POLL_TIMEOUT_MS = 5 * 60_000;
/**
 * How long we wait for the person to finish on the credential landing page.
 * Creating a Telegram bot or a Slack app routinely takes longer than the 5
 * minutes we allow for a `/start` tap or an OAuth install. Matches the setup
 * token's server-side TTL, so the page and the CLI give up together.
 */
export const SETUP_PAGE_POLL_TIMEOUT_MS = 15 * 60_000;
export const CREDENTIAL_PROPAGATION_TIMEOUT_MS = 30_000;

export type SetupPageOutcome = 'saved' | 'expired' | 'invalid' | 'timeout';

export function isChannelName(value: string): value is ChannelName {
  return (CHANNEL_NAMES as readonly string[]).includes(value);
}

export function viaForProviderId(providerId: string): ChannelName | null {
  switch (providerId) {
    case 'telegram':
      return 'telegram';
    case 'slack':
    case 'novu-slack':
      return 'slack';
    case 'agent-email-inbox':
      return 'email';
    default:
      return null;
  }
}

export function providerIdsForVia(via: ChannelName): readonly string[] {
  switch (via) {
    case 'telegram':
      return ['telegram'];
    case 'slack':
      return ['slack', 'novu-slack'];
    case 'email':
      return ['agent-email-inbox'];
    default: {
      const exhaustive: never = via;

      return exhaustive;
    }
  }
}

export function findLinkedIntegration(
  links: AgentIntegrationLink[],
  via: ChannelName
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
  return err instanceof ApiError && err.status === 404 && /missing credentials/i.test(err.message);
}

/** The Telegram integration exists but has no BotFather token saved yet. */
export function isMissingBotTokenError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 422 && /bot token is missing/i.test(err.message);
}

/**
 * Where to send the person to paste credentials.
 *
 * Against Novu Cloud we use the agentinbox.md `/connect` page with the token in the
 * URL fragment (never sent to the server, so it stays out of access logs and
 * Referer headers). Any other API URL means self-hosted or local dev, where the
 * agentinbox.md page could not use the token anyway (it calls Novu Cloud's API
 * through its own `/api`), so we hand back the URL the server minted — that
 * deployment's own dashboard page.
 */
export function buildSetupPageUrl(
  apiUrl: string,
  channel: Exclude<ChannelName, 'email'>,
  token: string,
  fallbackUrl: string
): string {
  const normalizedApiUrl = apiUrl.replace(/\/$/, '');
  if (normalizedApiUrl !== DEFAULT_API_URL) {
    return fallbackUrl;
  }

  const query = channel === 'telegram' ? '' : `?channel=${channel}`;

  return `${SETUP_PAGE_ORIGIN}/connect${query}#${token}`;
}

type SetupLinkStatus = { valid: boolean; reason?: 'expired' | 'used' | 'invalid' };

/**
 * Blocks until the landing page consumes the setup token (status flips to
 * `used`), or until the token dies / the wait runs out.
 */
async function waitForSetupPage(
  readStatus: () => Promise<SetupLinkStatus>,
  options: { intervalMs?: number; timeoutMs?: number } = {}
): Promise<SetupPageOutcome> {
  let failure: Extract<SetupPageOutcome, 'expired' | 'invalid'> | undefined;

  const saved = await pollUntil(
    async () => {
      const status = await readStatus();
      if (status.valid) return 'pending';
      if (status.reason === 'used') return 'done';

      failure = status.reason === 'expired' ? 'expired' : 'invalid';

      return 'failed';
    },
    {
      intervalMs: options.intervalMs ?? CHANNEL_POLL_INTERVAL_MS,
      timeoutMs: options.timeoutMs ?? SETUP_PAGE_POLL_TIMEOUT_MS,
    }
  );

  if (saved) {
    return 'saved';
  }

  return failure ?? 'timeout';
}

export function waitForTelegramSetupPage(
  client: ApiClient,
  token: string,
  options: { intervalMs?: number; timeoutMs?: number } = {}
): Promise<SetupPageOutcome> {
  return waitForSetupPage(() => getTelegramMobileLinkStatus(client, token), options);
}

export function waitForSlackSetupPage(
  client: ApiClient,
  token: string,
  options: { intervalMs?: number; timeoutMs?: number } = {}
): Promise<SetupPageOutcome> {
  return waitForSetupPage(() => getSlackSetupLinkStatus(client, token), options);
}

export async function waitForEndpoint(
  client: ApiClient,
  integrationIdentifier: string,
  subscriberId: string,
  waitingFor: string,
  timeoutHint = 'Re-run `npx @agentinbox/cli setup` to continue.'
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
  client: ApiClient,
  subscriberId: string,
  agentIdentifier: string | undefined,
  vias: readonly ChannelName[],
  waitingFor: string,
  timeoutHint: string
): Promise<ChannelName> {
  const found: { via?: ChannelName } = {};

  await pollUntil(
    async () => {
      try {
        const contact = await getContact(client, subscriberId, agentIdentifier);
        const match = contact.channels?.find(
          (channel) => isChannelName(channel.via) && vias.includes(channel.via) && channel.status === 'verified'
        );
        if (match && isChannelName(match.via)) {
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
 * Polls until the link from the request identified by `requestedAt` has been
 * used. A previously verified address stays `verified` while a replacement is
 * pending, and masked addresses can collide, so only the request id is trusted.
 */
export async function waitForVerifiedEmail(
  client: ApiClient,
  subscriberId: string,
  agentIdentifier: string | undefined,
  requestedAt: string,
  waitingFor: string,
  timeoutHint: string
): Promise<void> {
  const confirmed = await pollUntil(
    async () => {
      try {
        const contact = await getContact(client, subscriberId, agentIdentifier);
        const channel = contact.channels?.find((item) => item.via === 'email');
        if (channel?.status === 'verified' && channel.verifiedRequestedAt === requestedAt) {
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
 * integration the person connects on, out of several they could pick from.
 */
export async function waitForAnyEndpoint(
  client: ApiClient,
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
  client: ApiClient,
  integrationIdentifier: string,
  subscriberId: string
): Promise<{ deepLinkUrl: string; botUsername: string }> {
  const deadline = Date.now() + CREDENTIAL_PROPAGATION_TIMEOUT_MS;

  while (true) {
    try {
      return await issueTelegramSubscriberLink(client, integrationIdentifier, subscriberId);
    } catch (err) {
      if (!isMissingBotTokenError(err) || Date.now() >= deadline) {
        throw err;
      }

      await sleep(2_000);
    }
  }
}

export async function generateSlackUserOauthUrl(
  client: ApiClient,
  input: { integrationIdentifier: string; agentIdentifier: string; subscriberId: string }
): Promise<string> {
  try {
    return await generateConnectOauthUrl(client, input);
  } catch (err) {
    if (isMissingSlackCredentialsError(err)) {
      throw new Error(
        'No slack channel is linked with credentials. Run `npx @agentinbox/cli channel add slack` first.'
      );
    }

    throw err;
  }
}
