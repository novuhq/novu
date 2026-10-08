'use server';

import { currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

import { type HumanAccount, requireHumanAccount } from '@/lib/human-account';
import { HumanApiError } from '@/lib/human-api-error';
import {
  type ChannelVia,
  createSlackApp,
  ensureSlackChannel,
  ensureTelegramChannel,
  findSlackWorkspace,
  issueSlackInstallUrl,
  issueTelegramStartLink,
  listChannels,
  renameChannel,
  type SlackWorkspace,
  saveTelegramBotToken,
  sendTestMessage,
} from '@/lib/human-channels-api';
import { ensureOperatorContact, ensureRelay, findOperatorContactId } from '@/lib/human-operator';
import { readSlackSetup, type SlackSetupState } from '@/lib/human-slack-setup';
import { readTelegramSetup, type TelegramSetupState } from '@/lib/human-telegram-setup';
import { validateSlackAppName, validateSlackConfigToken } from '@/lib/slack-app';

const CHANNELS_PATH = '/channels';

/** What BotFather hands out: the bot's numeric id, a colon, then the secret. */
const BOT_TOKEN_PATTERN = /^\d+:[\w-]+$/;

/** A token that was just saved can take a moment to be readable. */
const START_LINK_ATTEMPTS_AFTER_SAVE = 3;

/** So can the credentials of a Slack app that was just created. */
const INSTALL_URL_ATTEMPTS = 3;

export type SaveTelegramTokenResult =
  // `startUrl` is empty when the token was saved but the link couldn't be made yet.
  { ok: true; botUsername: string; startUrl: string } | { ok: false; error: string };

/**
 * Reads the setup again for a drawer that opened on a page where it couldn't be read. Still `unknown`
 * when the API or Telegram doesn't answer this time either.
 */
export async function loadTelegramSetupAction(): Promise<TelegramSetupState> {
  const account = await requireHumanAccount({ returnTo: CHANNELS_PATH });
  const [channels, contactId] = await Promise.all([listChannels(account), findOperatorContactId(account)]);

  return readTelegramSetup(
    account,
    channels.find((channel) => channel.via === 'telegram' && channel.active),
    contactId
  );
}

/**
 * A fresh "say hi" link. A link stops working after a while, so the drawer swaps it for a new one
 * when it opens on that step and when the operator asks to keep waiting. `null` when there's nothing to
 * link yet, or no link could be made just now.
 */
export async function refreshTelegramStartLinkAction(): Promise<{ botUsername: string; startUrl: string } | null> {
  const account = await requireHumanAccount({ returnTo: CHANNELS_PATH });
  const [channelIdentifier, contactId] = await Promise.all([
    findTelegramChannel(account),
    findOperatorContactId(account),
  ]);
  if (!channelIdentifier || !contactId) {
    return null;
  }

  try {
    const link = await issueTelegramStartLink(account, channelIdentifier, contactId);

    return { botUsername: link.botUsername, startUrl: link.url };
  } catch (error) {
    if (error instanceof HumanApiError) {
      return null;
    }

    throw error;
  }
}

/** Gives the agent its Telegram bot, and returns the link the operator opens to say hi to it. */
export async function saveTelegramTokenAction(botToken: string): Promise<SaveTelegramTokenResult> {
  const token = botToken.trim();
  if (!BOT_TOKEN_PATTERN.test(token)) {
    return { ok: false, error: INVALID_TOKEN_MESSAGE };
  }

  const account = await requireHumanAccount({ returnTo: CHANNELS_PATH });

  try {
    const contactId = await findOrCreateOperatorContact(account);
    const channelIdentifier = await ensureTelegramChannel(account);
    const { botUsername } = await saveTelegramBotToken(account, channelIdentifier, token);

    revalidatePath(CHANNELS_PATH);

    // The token is saved from here on. A link that can't be made right now must not read as a failed
    // save: the drawer moves on and asks for the link again.
    const link = await issueTelegramStartLink(account, channelIdentifier, contactId, {
      attempts: START_LINK_ATTEMPTS_AFTER_SAVE,
    }).catch((error: unknown) => {
      console.error('Saved the Telegram bot token, but could not make the start link', error);

      return null;
    });

    return { ok: true, botUsername: link?.botUsername || botUsername, startUrl: link?.url ?? '' };
  } catch (error) {
    console.error('Failed to save the Telegram bot token', error);

    return { ok: false, error: describeSaveError(error) };
  }
}

/** Whether someone has pressed Start in the bot. The drawer asks while it waits. */
export async function checkTelegramConnectedAction(): Promise<boolean> {
  const account = await requireHumanAccount({ returnTo: CHANNELS_PATH });
  const channels = await listChannels(account);
  const connected = channels.some((channel) => channel.via === 'telegram' && channel.active && channel.connected);

  if (connected) {
    revalidatePath(CHANNELS_PATH);
  }

  return connected;
}

export type CreateSlackAppResult =
  // `field` is the input the message belongs under.
  { ok: true } | { ok: false; field: 'name' | 'token'; error: string };

/** Reads the Slack setup again for a drawer that opened on a page where it couldn't be read. */
export async function loadSlackSetupAction(): Promise<SlackSetupState> {
  const account = await requireHumanAccount({ returnTo: CHANNELS_PATH });
  const [channels, contactId] = await Promise.all([listChannels(account), findOperatorContactId(account)]);

  return readSlackSetup(
    account,
    channels.find((channel) => channel.via === 'slack' && channel.active),
    contactId
  );
}

/**
 * Creates the agent's Slack app under `appName`, in the workspace the App Configuration Token is for.
 * The token goes to the API for this one call and is kept nowhere. Same steps as `human setup slack`.
 */
export async function createSlackAppAction(appName: string, configToken: string): Promise<CreateSlackAppResult> {
  const name = appName.trim();
  const token = configToken.trim();

  const nameError = validateSlackAppName(name);
  if (nameError) {
    return { ok: false, field: 'name', error: nameError };
  }

  const tokenError = validateSlackConfigToken(token);
  if (tokenError) {
    return { ok: false, field: 'token', error: tokenError };
  }

  const account = await requireHumanAccount({ returnTo: CHANNELS_PATH });

  try {
    const { agentId } = await ensureRelayWithOperator(account);
    const channel = await ensureSlackChannel(account, name);

    // The app takes its name from the channel, and a channel from an earlier try may have another one.
    if (channel.name !== name) {
      await renameChannel(account, channel.id, name);
    }

    await createSlackApp(account, channel.id, { configToken: token, agentId });
    revalidatePath(CHANNELS_PATH);

    return { ok: true };
  } catch (error) {
    console.error('Failed to create the Slack app', error);

    return { ok: false, field: 'token', error: describeSlackAppError(error) };
  }
}

/**
 * The Slack page where the operator installs the app. A link works for five minutes, so the drawer asks
 * for a new one on every click. `null` when there's no app to install yet, or no link could be made.
 */
export async function getSlackInstallUrlAction(): Promise<string | null> {
  const account = await requireHumanAccount({ returnTo: CHANNELS_PATH });
  const [channelIdentifier, contactId] = await Promise.all([
    findChannel(account, 'slack'),
    findOperatorContactId(account),
  ]);
  if (!channelIdentifier || !contactId) {
    return null;
  }

  try {
    return await issueSlackInstallUrl(account, channelIdentifier, contactId, { attempts: INSTALL_URL_ATTEMPTS });
  } catch (error) {
    if (error instanceof HumanApiError) {
      console.error('Could not make the Slack install link', error);

      return null;
    }

    throw error;
  }
}

/**
 * The workspace the app was installed in, or `null` while nobody has installed it. The drawer asks while
 * it waits.
 */
export async function checkSlackConnectedAction(): Promise<SlackWorkspace | null> {
  const account = await requireHumanAccount({ returnTo: CHANNELS_PATH });
  const channels = await listChannels(account);
  const slack = channels.find((channel) => channel.via === 'slack' && channel.active && channel.connected);
  if (!slack) {
    return null;
  }

  revalidatePath(CHANNELS_PATH);

  // The name is a nicety: Slack counts as connected when it can't be read.
  return (await findSlackWorkspace(account, slack.identifier).catch(() => undefined)) ?? {};
}

/**
 * Has the agent send the operator a DM, right after the install, as `human setup slack` does. `false`
 * when it couldn't be sent; Slack is connected either way.
 */
export async function sendSlackTestMessageAction(): Promise<boolean> {
  const account = await requireHumanAccount({ returnTo: CHANNELS_PATH });
  const contactId = await findOperatorContactId(account);
  if (!contactId) {
    return false;
  }

  try {
    await sendTestMessage(account, contactId, 'slack');

    return true;
  } catch (error) {
    if (error instanceof HumanApiError) {
      console.error('Slack is connected, but the test message could not be sent', error);

      return false;
    }

    throw error;
  }
}

const INVALID_TOKEN_MESSAGE = 'Token isn’t valid. Copy it again from BotFather; it’s the line after “Use this token”.';

function findTelegramChannel(account: HumanAccount): Promise<string | undefined> {
  return findChannel(account, 'telegram');
}

async function findChannel(account: HumanAccount, via: ChannelVia): Promise<string | undefined> {
  const channels = await listChannels(account);

  return channels.find((channel) => channel.via === via && channel.active)?.identifier;
}

/**
 * The operator's own contact. It's made with the account, so this is a lookup; only an account from
 * before that (remembered by an older dashboard, or made by a CLI login that never ran `human setup`)
 * has none and gets its agent and contact here.
 */
async function findOrCreateOperatorContact(account: HumanAccount): Promise<string> {
  const existing = await findOperatorContactId(account);
  if (existing) {
    return existing;
  }

  const user = await currentUser();

  return ensureOperatorContact(account, { firstName: user?.firstName, lastName: user?.lastName });
}

/** The relay agent and the operator's contact, for a step that needs the agent's own id too. */
async function ensureRelayWithOperator(account: HumanAccount): Promise<{ agentId: string; contactId: string }> {
  if (await findOperatorContactId(account)) {
    return ensureRelay(account);
  }

  const user = await currentUser();

  return ensureRelay(account, { firstName: user?.firstName, lastName: user?.lastName });
}

/** What Slack answers to a token it doesn't take, as the API passes it on. */
const SLACK_TOKEN_REFUSED = /invalid_token|token_expired|token_revoked|invalid_auth|not_authed|account_inactive/;

function describeSlackAppError(error: unknown): string {
  if (error instanceof HumanApiError && error.status >= 400 && error.status < 500) {
    if (SLACK_TOKEN_REFUSED.test(error.message)) {
      return 'Slack didn’t accept that token. They stop working after 12 hours: generate a new one and paste it again.';
    }

    if (error.status !== 401 && error.status !== 403) {
      return error.message;
    }
  }

  return 'Something went wrong while creating the app. Please try again.';
}

function describeSaveError(error: unknown): string {
  if (error instanceof HumanApiError) {
    // The API answers 502 when Telegram doesn't know the token.
    if (error.status === 502) {
      return INVALID_TOKEN_MESSAGE;
    }

    if (error.status >= 400 && error.status < 500 && error.status !== 401 && error.status !== 403) {
      return error.message;
    }
  }

  return 'Something went wrong while saving the token. Please try again.';
}
