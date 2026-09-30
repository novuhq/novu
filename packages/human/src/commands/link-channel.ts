import { type HumanApiClient, HumanApiError } from '../api/client';
import {
  type AgentIntegrationLink,
  generateConnectOauthUrl,
  getSlackSetupLinkStatus,
  getTelegramMobileLinkStatus,
  hasChannelEndpoint,
  issueTelegramSubscriberLink,
} from '../api/setup';
import { DEFAULT_API_URL, HUMAN_SETUP_PAGE_ORIGIN } from '../config';
import { pollUntil, sleep } from '../poll';

export const HUMAN_CHANNELS = ['telegram', 'slack', 'email'] as const;
export type HumanChannel = (typeof HUMAN_CHANNELS)[number];

export const CHANNEL_POLL_INTERVAL_MS = 2_000;
export const CHANNEL_POLL_TIMEOUT_MS = 5 * 60_000;
/**
 * How long we wait for the human to finish on the credential landing page.
 * Creating a Telegram bot or a Slack app routinely takes longer than the 5
 * minutes we allow for a `/start` tap or an OAuth install. Matches the setup
 * token's server-side TTL, so the page and the CLI give up together.
 */
export const SETUP_PAGE_POLL_TIMEOUT_MS = 15 * 60_000;
export const CREDENTIAL_PROPAGATION_TIMEOUT_MS = 30_000;

export type SetupPageOutcome = 'saved' | 'expired' | 'invalid' | 'timeout';

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

/** The Telegram integration exists but has no BotFather token saved yet. */
export function isMissingBotTokenError(err: unknown): boolean {
  return err instanceof HumanApiError && err.status === 422 && /bot token is missing/i.test(err.message);
}

/**
 * Where to send the human to paste credentials.
 *
 * Against Novu Cloud we use the human.md landing page with the token in the
 * URL fragment (never sent to the server, so it stays out of access logs and
 * Referer headers). Any other API URL means self-hosted or local dev, where the
 * gethuman.md page could not reach the API anyway (CORS, mixed content), so we
 * hand back the URL the server minted — that deployment's own dashboard page.
 */
export function buildSetupPageUrl(
  apiUrl: string,
  channel: Exclude<HumanChannel, 'email'>,
  token: string,
  fallbackUrl: string
): string {
  const normalizedApiUrl = apiUrl.replace(/\/$/, '');
  if (normalizedApiUrl !== DEFAULT_API_URL) {
    return fallbackUrl;
  }

  const query = channel === 'telegram' ? '' : `?channel=${channel}`;

  return `${HUMAN_SETUP_PAGE_ORIGIN}/connect${query}#${token}`;
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
  client: HumanApiClient,
  token: string,
  options: { intervalMs?: number; timeoutMs?: number } = {}
): Promise<SetupPageOutcome> {
  return waitForSetupPage(() => getTelegramMobileLinkStatus(client, token), options);
}

export function waitForSlackSetupPage(
  client: HumanApiClient,
  token: string,
  options: { intervalMs?: number; timeoutMs?: number } = {}
): Promise<SetupPageOutcome> {
  return waitForSetupPage(() => getSlackSetupLinkStatus(client, token), options);
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
      if (!isMissingBotTokenError(err) || Date.now() >= deadline) {
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
