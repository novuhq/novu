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
  label: string;
  /** The name the channel was made with, such as "Human". */
  name?: string;
  active: boolean;
  /** Missing for a provider the relay isn't expected to have. */
  via?: ChannelVia;
  /** The agent's own email address, for the email channel. */
  address?: string;
  /** When the first message from a person arrived on this channel. */
  connectedAt?: string;
};

type AgentIntegrationLink = {
  integration: {
    identifier: string;
    name?: string;
    providerId: string;
    channel?: string;
    active?: boolean;
    sharedInboundAddress?: string;
  };
  connectedAt?: string | null;
};

type Integration = { identifier: string; providerId: string; channel?: string };

/** The bot of a Telegram channel, and the link that opens it and presses Start for one contact. */
export type TelegramStartLink = { botUsername: string; url: string };

const TELEGRAM_PROVIDER_ID = 'telegram';

const START_LINK_RETRY_MS = 1000;

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

  return (Array.isArray(links) ? links : []).map(({ integration, connectedAt }) => {
    const via = channelVia(integration.providerId, integration.channel);

    return {
      identifier: integration.identifier,
      label: via ? CHANNEL_LABELS[via] : integration.providerId,
      ...(integration.name ? { name: integration.name } : {}),
      active: integration.active !== false,
      via,
      ...(integration.sharedInboundAddress ? { address: integration.sharedInboundAddress } : {}),
      ...(connectedAt ? { connectedAt } : {}),
    };
  });
}

/** Whether a contact already linked their chat on a channel, which is when messages can reach them there. */
export async function hasChannelEndpoint(
  account: HumanAccount,
  channelIdentifier: string,
  contactId: string
): Promise<boolean> {
  const endpoints = await requestForAccount<unknown[]>(account, '/v1/channel-endpoints', {
    query: { subscriberId: contactId, integrationIdentifier: channelIdentifier, limit: 1 },
  });

  return Array.isArray(endpoints) && endpoints.length > 0;
}

/** The Slack workspace a channel's app is installed in, once someone connected it. */
export async function findSlackWorkspaceName(
  account: HumanAccount,
  channelIdentifier: string
): Promise<string | undefined> {
  const page = await requestPageForAccount<{ data?: Array<{ workspace?: { name?: string } }> }>(
    account,
    '/v1/channel-connections',
    { query: { integrationIdentifier: channelIdentifier, limit: 1 } }
  );

  return page?.data?.[0]?.workspace?.name || undefined;
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
  const linked = (await listChannels(account)).find((channel) => channel.via === 'telegram' && channel.active);
  if (linked) {
    return linked.identifier;
  }

  const integrations = await requestForAccount<Integration[]>(account, '/v1/integrations');
  const existing = (Array.isArray(integrations) ? integrations : []).find(
    (integration) => integration.providerId === TELEGRAM_PROVIDER_ID && integration.channel === 'chat'
  );
  const integration =
    existing ??
    (await requestForAccount<Integration>(account, '/v1/integrations', {
      method: 'POST',
      body: { providerId: TELEGRAM_PROVIDER_ID, channel: 'chat', name: 'Human', active: true, credentials: {} },
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

  return integration.identifier;
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

      await new Promise((resolve) => setTimeout(resolve, START_LINK_RETRY_MS));
    }
  }
}

function channelVia(providerId: string, channel?: string): ChannelVia | undefined {
  if (providerId.includes('telegram')) return 'telegram';
  if (providerId.includes('slack')) return 'slack';
  if (channel === 'email') return 'email';

  return undefined;
}
