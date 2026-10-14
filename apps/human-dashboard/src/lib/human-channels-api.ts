import 'server-only';

import type { HumanAccount } from './human-account';
import { RELAY_AGENT_IDENTIFIER } from './human-agent-api';
import { HumanApiError, isHumanApiNotFound } from './human-api-error';
import { requestForAccount, requestPageForAccount } from './human-api-key';

/** The most links the API returns at once; a relay has a handful. */
const CHANNELS_LIMIT = 100;

export type ChannelVia = 'telegram' | 'slack' | 'email';

export type Channel = {
  identifier: string;
  /** The channel's own id, which a few endpoints ask for instead of the identifier. */
  id: string;
  label: string;
  /** The name the channel was made with, such as "Human". */
  name?: string;
  active: boolean;
  /** Missing for a provider the relay isn't expected to have. */
  via?: ChannelVia;
  /** The agent's own email address, for the email channel. */
  address?: string;
  /**
   * Whether the agent can reach someone on it. Email is connected as soon as the agent has its address.
   * A bot or app only counts once a person wrote to it or linked their chat, so a channel whose setup
   * stopped halfway still reads as not set up.
   */
  connected: boolean;
};

type AgentIntegrationLink = {
  integration: {
    _id: string;
    identifier: string;
    name?: string;
    providerId: string;
    channel?: string;
    active?: boolean;
    sharedInboundAddress?: string;
  };
  /** When the first message from a person arrived on this channel. */
  connectedAt?: string | null;
  /** Present, and true, once someone linked their chat on this channel. */
  hasChannelEndpoints?: boolean;
};

type Integration = { _id: string; identifier: string; name?: string; providerId: string; channel?: string };

/** The bot of a Telegram channel, and the link that opens it and presses Start for one contact. */
export type TelegramStartLink = { botUsername: string; url: string };

const TELEGRAM_PROVIDER_ID = 'telegram';
const SLACK_PROVIDER_ID = 'slack';

/** The name a channel gets when the operator doesn't pick one, same as `human setup`. */
const DEFAULT_CHANNEL_NAME = 'Human';

const RETRY_MS = 1000;

/** What `human setup` sends too, once a channel works. */
const TEST_MESSAGE =
  'You’re connected. Agents can now reach you here. Try `human inbox approve "Deploy to production?"` in your terminal.';

const CHANNEL_LABELS: Record<ChannelVia, string> = { telegram: 'Telegram', slack: 'Slack', email: 'Email' };

/** The channels connected to the operator's relay agent. */
export async function listChannels(account: HumanAccount): Promise<Channel[]> {
  let links: AgentIntegrationLink[];

  try {
    links = await requestForAccount<AgentIntegrationLink[]>(
      account,
      `/v1/agents/${RELAY_AGENT_IDENTIFIER}/integrations`,
      { query: { limit: CHANNELS_LIMIT } }
    );
  } catch (error) {
    // A 404 means there's no relay yet: nothing has been set up in this account.
    if (isHumanApiNotFound(error)) {
      return [];
    }

    throw error;
  }

  return (Array.isArray(links) ? links : []).map(({ integration, connectedAt, hasChannelEndpoints }) => {
    const via = channelVia(integration.providerId, integration.channel);

    return {
      identifier: integration.identifier,
      id: integration._id,
      label: via ? CHANNEL_LABELS[via] : integration.providerId,
      ...(integration.name ? { name: integration.name } : {}),
      active: integration.active !== false,
      via,
      ...(integration.sharedInboundAddress ? { address: integration.sharedInboundAddress } : {}),
      connected: via === 'email' || Boolean(connectedAt) || hasChannelEndpoints === true,
    };
  });
}

/** The Slack workspace a channel's app is installed in, and since when. */
export type SlackWorkspace = { name?: string; connectedAt?: string };

/** `undefined` until someone installed the app. */
export async function findSlackWorkspace(
  account: HumanAccount,
  channelIdentifier: string
): Promise<SlackWorkspace | undefined> {
  const page = await requestPageForAccount<{ data?: Array<{ workspace?: { name?: string }; createdAt?: string }> }>(
    account,
    '/v1/channel-connections',
    { query: { integrationIdentifier: channelIdentifier, limit: 1 } }
  );
  const connection = page?.data?.[0];

  return connection && { name: connection.workspace?.name || undefined, connectedAt: connection.createdAt };
}

/**
 * Whether a contact has linked the channel themselves. A channel counts as connected as soon as anyone
 * has, so this is how to tell that the operator did, the way `human setup` waits for it.
 */
export async function hasLinkedChannel(
  account: HumanAccount,
  channelIdentifier: string,
  contactId: string
): Promise<boolean> {
  const page = await requestPageForAccount<{ data?: unknown[] }>(account, '/v1/channel-endpoints', {
    query: { subscriberId: contactId, integrationIdentifier: channelIdentifier, limit: 1 },
  });

  return (page?.data?.length ?? 0) > 0;
}

/**
 * How the agent's Slack app shows up in a workspace. The API creates the app under the channel's name
 * minus the word "slack", which Slack doesn't allow in an app's name (`SlackQuickSetup`). The API doesn't
 * hand the name back from Slack, so an app renamed there later still shows this one.
 */
export function slackAgentHandle(channel: Channel): string | undefined {
  const name = channel.name?.replace(/slack/gi, '').trim();

  return name ? `@${name}` : undefined;
}

/**
 * The relay's Telegram channel, made and linked to the relay when it has none. Same steps as
 * `human setup telegram`; the relay has to exist first.
 */
export async function ensureTelegramChannel(account: HumanAccount): Promise<string> {
  return (await ensureChatChannel(account, 'telegram', TELEGRAM_PROVIDER_ID)).identifier;
}

/**
 * The relay's Slack channel, made under `name` and linked to the relay when it has none. Same steps as
 * `human setup slack`. A channel that's there already keeps its name; `renameChannel` changes it.
 */
export function ensureSlackChannel(account: HumanAccount, name: string): Promise<LinkedChannel> {
  return ensureChatChannel(account, 'slack', SLACK_PROVIDER_ID, name);
}

type LinkedChannel = { identifier: string; id: string; name?: string };

async function ensureChatChannel(
  account: HumanAccount,
  via: ChannelVia,
  providerId: string,
  name = DEFAULT_CHANNEL_NAME
): Promise<LinkedChannel> {
  const linked = (await listChannels(account)).find((channel) => channel.via === via && channel.active);
  if (linked) {
    return { identifier: linked.identifier, id: linked.id, name: linked.name };
  }

  const integrations = await requestForAccount<Integration[]>(account, '/v1/integrations');
  const existing = (Array.isArray(integrations) ? integrations : []).find(
    (integration) => integration.providerId === providerId && integration.channel === 'chat'
  );
  const integration =
    existing ??
    (await requestForAccount<Integration>(account, '/v1/integrations', {
      method: 'POST',
      body: { providerId, channel: 'chat', name, active: true, credentials: {} },
    }));

  try {
    await requestForAccount(account, `/v1/agents/${RELAY_AGENT_IDENTIFIER}/integrations`, {
      method: 'POST',
      body: { integrationIdentifier: integration.identifier },
    });
  } catch (error) {
    // A 409 means it's linked already.
    if (!(error instanceof HumanApiError) || error.status !== 409) {
      throw error;
    }
  }

  return { identifier: integration.identifier, id: integration._id, name: integration.name };
}

/** Gives a channel another name. For Slack it's the name its app is created under. */
export async function renameChannel(account: HumanAccount, channelId: string, name: string): Promise<void> {
  await requestForAccount(account, `/v1/integrations/${encodeURIComponent(channelId)}`, {
    method: 'PUT',
    body: { name },
  });
}

/**
 * Creates the agent's Slack app from our manifest, in the workspace the App Configuration Token belongs
 * to, and saves the app's credentials on the channel. The API uses the token for this one call and
 * doesn't keep it. A token Slack turns down comes back as a 400.
 */
export async function createSlackApp(
  account: HumanAccount,
  channelId: string,
  { configToken, agentId }: { configToken: string; agentId: string }
): Promise<void> {
  await requestForAccount(account, `/v1/integrations/${encodeURIComponent(channelId)}/slack-quick-setup`, {
    method: 'POST',
    body: { configToken, agentId },
  });
}

/**
 * The Slack page where the operator installs the agent's app in their workspace. Installing also tells
 * the agent which Slack user the contact is, and that's who it sends DMs to. The link works for five
 * minutes. The API answers 404 while the channel has no app yet; a `attempts` above 1 waits for an app
 * that was created a moment ago.
 */
export async function issueSlackInstallUrl(
  account: HumanAccount,
  channelIdentifier: string,
  contactId: string,
  { attempts = 1 }: { attempts?: number } = {}
): Promise<string> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const link = await requestForAccount<{ url?: string } | string>(
        account,
        '/v1/integrations/channel-connections/oauth',
        {
          method: 'POST',
          body: {
            integrationIdentifier: channelIdentifier,
            subscriberId: contactId,
            connectionMode: 'subscriber',
            autoLinkUser: true,
          },
        }
      );
      const url = typeof link === 'string' ? link : link?.url;
      if (!url) {
        throw new HumanApiError(502, 'unavailable', 'Slack didn’t give us a link. Please try again.');
      }

      return url;
    } catch (error) {
      if (attempt >= attempts) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
    }
  }
}

/** Has the agent say hello on a channel that was just connected, so the operator sees it work. */
export async function sendTestMessage(account: HumanAccount, contactId: string, via: ChannelVia): Promise<void> {
  await requestForAccount(account, '/v1/human/interactions', {
    method: 'POST',
    body: {
      kind: 'tell',
      card: { title: TEST_MESSAGE },
      to: contactId,
      via,
      agentIdentifier: RELAY_AGENT_IDENTIFIER,
    },
  });
}

/**
 * Saves the BotFather token on the Telegram channel and points the bot at the API. The API stores the
 * token encrypted and asks Telegram who the bot is, so a token Telegram doesn't know fails here.
 */
export async function saveTelegramBotToken(
  account: HumanAccount,
  channelIdentifier: string,
  botToken: string
): Promise<{ botUsername: string }> {
  const setupLink = await requestForAccount<{ token: string }>(
    account,
    `/v1/integrations/${encodeURIComponent(channelIdentifier)}/mobile-link`,
    { method: 'POST', body: {} }
  );

  return requestForAccount<{ botUsername: string }>(account, '/v1/integrations/mobile-configure', {
    method: 'POST',
    body: { token: setupLink.token, botToken },
  });
}

/**
 * The link a contact opens to press Start in the bot. Fails while the channel has no working bot token;
 * a token saved a moment ago can take a few `attempts` to be readable.
 */
export async function issueTelegramStartLink(
  account: HumanAccount,
  channelIdentifier: string,
  contactId: string,
  { attempts = 1 }: { attempts?: number } = {}
): Promise<TelegramStartLink> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const link = await requestForAccount<{ url: string; providerMetadata?: { botUsername?: string } }>(
        account,
        '/v1/integrations/channel-endpoints/link',
        { method: 'POST', body: { integrationIdentifier: channelIdentifier, subscriberId: contactId } }
      );

      return { url: link.url, botUsername: link.providerMetadata?.botUsername ?? '' };
    } catch (error) {
      if (attempt >= attempts) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
    }
  }
}

function channelVia(providerId: string, channel?: string): ChannelVia | undefined {
  if (providerId.includes('telegram')) return 'telegram';
  if (providerId.includes('slack')) return 'slack';
  if (channel === 'email') return 'email';

  return undefined;
}
