import { type AgentInboxApi, AgentInboxApiError } from './agent-inbox-api';
import { type AgentInfo, readIfMissing } from './setup';

/** The channels a person adds through a link. Email is not one: `inbox_setup` handles the owner's. */
export const ADDABLE_CHANNELS = ['telegram', 'slack'] as const;

type AddableChannel = (typeof ADDABLE_CHANNELS)[number];

export type ChannelAddInput = { channel: AddableChannel };

type Sleep = (ms: number) => Promise<void>;

/** An integration: what `/v1/channels/apps` lists, and what each row of `/v1/channels` has inside it. */
type Integration = {
  _id: string;
  identifier: string;
  providerId: string;
  channel?: string;
  active?: boolean;
};

type SetupLink = { token: string; expiresAt: string };

type StartLink = { url: string; providerMetadata: { botUsername: string; expiresAt: string } };

/** Slack's link carries no expiry of its own. The API stops accepting it after this long (`validateAndDecodeState`). */
const SLACK_INSTALL_LINK_MINUTES = 5;

/**
 * How the API says the person's part isn't done yet. Slack has two wordings: no credentials at all, and
 * some credentials without a client id.
 */
const MISSING_CREDENTIALS: Record<AddableChannel, { status: number; message: RegExp }> = {
  telegram: { status: 422, message: /bot token is missing/i },
  slack: { status: 404, message: /missing (?:required oauth )?credentials/i },
};

const RECHECK_EVERY_MS = 2_000;

/**
 * How many more times to look for saved credentials before sending the person to the setup page. The page
 * tells them it's done only after its request has saved them, and every read here goes to the database's
 * primary with no cache, so a call made after that sees them at once. What's left is a call made while that
 * request is running, when the link already reads as used: a few database calls for Telegram, and for Slack
 * also the time Slack takes to create the app, which the API gives up on after 5 seconds. This covers both.
 */
const RECHECKS: Record<AddableChannel, number> = { telegram: 1, slack: 3 };

const LABELS: Record<AddableChannel, string> = { telegram: 'Telegram', slack: 'Slack' };

/**
 * `channel add telegram` and `channel add slack` from the CLI, without the wait: finds how far the channel got
 * and returns the one next step, a link the person finishes in their own browser. Nothing is kept between
 * calls, so the next one picks up from wherever they got to. Bot tokens and App Configuration Tokens never
 * pass through here, unlike the CLI's flags: the setup page collects them, so they stay out of chat transcripts
 * and host logs.
 */
export async function channelAdd(
  api: AgentInboxApi,
  { channel }: ChannelAddInput,
  sleep: Sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
): Promise<string> {
  const { agent, subscriberId } = await readOwner(api);
  const linked = await findLinkedIntegration(api, agent.agentIdentifier, channel);
  const integration = linked ?? (await linkIntegration(api, agent, channel));

  if (await hasEndpoint(api, integration.identifier, subscriberId)) {
    return `${LABELS[channel]} is connected. inbox_send can reach the user there with via: "${channel}".`;
  }

  // A setup link needs the integration linked to the agent, so only one that already was can have a page open.
  const rechecks = linked ? RECHECKS[channel] : 0;
  const whenSaved = <T>(step: () => Promise<T>) => runWhenSaved(step, channel, rechecks, sleep);

  return channel === 'telegram'
    ? nextTelegramStep(api, integration, subscriberId, whenSaved)
    : nextSlackStep(api, agent.agentIdentifier, integration, subscriberId, whenSaved);
}

async function readOwner(api: AgentInboxApi): Promise<{ agent: AgentInfo; subscriberId: string }> {
  const [agent, operator] = await Promise.all([
    readIfMissing(api.get<AgentInfo>('/v1/agent'), null),
    readIfMissing(api.get<{ subscriberId?: string }>('/v1/operator'), null),
  ]);

  if (!agent || !operator?.subscriberId) {
    throw new AgentInboxApiError(
      409,
      'Agent Inbox is not set up yet. Ask the user for an agent name and inbox address, call inbox_setup, then call channel_add again.'
    );
  }

  return { agent, subscriberId: operator.subscriberId };
}

async function findLinkedIntegration(
  api: AgentInboxApi,
  agentIdentifier: string,
  channel: AddableChannel
): Promise<Integration | null> {
  const links = await api.get<Array<{ integration: Integration }>>('/v1/channels', { agentIdentifier, limit: 100 });
  const link = links.find(({ integration }) => integration.providerId === channel && integration.active !== false);

  return link?.integration ?? null;
}

/** Links one the account already has, or else a new one named after the agent. A 409 means it's linked already. */
async function linkIntegration(api: AgentInboxApi, agent: AgentInfo, channel: AddableChannel): Promise<Integration> {
  const integrations = await api.get<Integration[]>('/v1/channels/apps');
  const integration =
    integrations.find(({ providerId, channel: kind }) => providerId === channel && kind === 'chat') ??
    (await api.post<Integration>('/v1/channels/apps', {
      providerId: channel,
      channel: 'chat',
      name: agent.name,
      active: true,
      credentials: {},
    }));

  try {
    await api.post(`/v1/channels?agentIdentifier=${encodeURIComponent(agent.agentIdentifier)}`, {
      integrationIdentifier: integration.identifier,
    });
  } catch (error) {
    if (!(error instanceof AgentInboxApiError) || error.status !== 409) {
      throw error;
    }
  }

  return integration;
}

async function hasEndpoint(api: AgentInboxApi, integrationIdentifier: string, subscriberId: string): Promise<boolean> {
  const endpoints = await api.get<unknown[]>('/v1/channels/links', { subscriberId, integrationIdentifier, limit: 1 });

  return endpoints.length > 0;
}

/** The result of a step, or `null` while the person's credentials aren't saved. */
async function runWhenSaved<T>(
  step: () => Promise<T>,
  channel: AddableChannel,
  rechecks: number,
  sleep: Sleep
): Promise<T | null> {
  for (let check = 0; check <= rechecks; check += 1) {
    if (check > 0) {
      await sleep(RECHECK_EVERY_MS);
    }

    try {
      return await step();
    } catch (error) {
      if (!isMissingCredentials(error, channel)) {
        throw error;
      }
    }
  }

  return null;
}

function isMissingCredentials(error: unknown, channel: AddableChannel): boolean {
  const { status, message } = MISSING_CREDENTIALS[channel];

  return error instanceof AgentInboxApiError && error.status === status && message.test(error.message);
}

async function nextTelegramStep(
  api: AgentInboxApi,
  integration: Integration,
  subscriberId: string,
  whenSaved: <T>(step: () => Promise<T>) => Promise<T | null>
): Promise<string> {
  // Making the `/start` link is also how to tell whether the integration has a bot yet.
  const start = await whenSaved(() =>
    api.post<StartLink>('/v1/channels/telegram/link', { integrationIdentifier: integration.identifier, subscriberId })
  );

  if (start) {
    const { botUsername, expiresAt } = start.providerMetadata;

    return nextStep(
      `Telegram has its bot, @${botUsername}. Give the user this link and ask them to tap Start: ${start.url}`,
      `It works until ${expiresAt}.`
    );
  }

  const setup = await api.post<SetupLink>(
    `/v1/channels/apps/${encodeURIComponent(integration.identifier)}/telegram-link`,
    { subscriberId }
  );

  return nextStep(
    `Telegram needs the user's own bot first. Give them this link to create it: ${setupPageUrl(api, 'telegram', setup.token)}`,
    `It works until ${setup.expiresAt}.`
  );
}

async function nextSlackStep(
  api: AgentInboxApi,
  agentIdentifier: string,
  integration: Integration,
  subscriberId: string,
  whenSaved: <T>(step: () => Promise<T>) => Promise<T | null>
): Promise<string> {
  // Making the install link is also how to tell whether the integration has an app yet. `autoLinkUser` has the
  // install tie the Slack user to this contact, which is who the agent then writes to.
  const install = await whenSaved(() =>
    api.post<{ url: string }>('/v1/channels/slack/install-link', {
      integrationIdentifier: integration.identifier,
      subscriberId,
      connectionMode: 'subscriber',
      autoLinkUser: true,
    })
  );

  if (install) {
    return nextStep(
      `The Slack app is ready. Give the user this link to add it to their workspace: ${install.url}`,
      `It works for ${SLACK_INSTALL_LINK_MINUTES} minutes.`
    );
  }

  // This route takes the integration's `_id`, where the Telegram one takes its identifier.
  const setup = await api.post<SetupLink>(
    `/v1/channels/apps/${encodeURIComponent(integration._id)}/slack-setup-link?agentIdentifier=${encodeURIComponent(agentIdentifier)}`,
    { subscriberId }
  );

  return nextStep(
    `Slack needs an app in the user's workspace first. Give them this link to create it: ${setupPageUrl(api, 'slack', setup.token)}`,
    `It works until ${setup.expiresAt}.`
  );
}

/**
 * The site's `/connect` page, which calls the API on its own address, so it has to be the site that issued the
 * token. The API's own `url` is no use here: it points at the Novu dashboard. The token stays in the fragment,
 * which browsers don't send to the server, so it stays out of access logs and Referer headers.
 */
function setupPageUrl(api: AgentInboxApi, channel: AddableChannel, token: string): string {
  const query = channel === 'telegram' ? '' : `?channel=${channel}`;

  return `${api.siteUrl}/connect${query}#${token}`;
}

function nextStep(step: string, expiry: string): string {
  return `${step}\n${expiry} After they finish, or if it stops working, call channel_add again.`;
}
