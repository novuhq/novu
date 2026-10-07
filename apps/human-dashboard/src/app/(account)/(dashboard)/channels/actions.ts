'use server';

import { currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

import { type HumanAccount, requireHumanAccount } from '@/lib/human-account';
import { HumanApiError } from '@/lib/human-api-error';
import {
  ensureTelegramChannel,
  hasChannelEndpoint,
  issueTelegramStartLink,
  listChannels,
  saveTelegramBotToken,
} from '@/lib/human-channels-api';
import { ensureOperatorContact, findOperatorContactId } from '@/lib/human-operator';

const CHANNELS_PATH = '/channels';

/** What BotFather hands out: the bot's numeric id, a colon, then the secret. */
const BOT_TOKEN_PATTERN = /^\d+:[\w-]+$/;

/** A token that was just saved can take a moment to be readable. */
const START_LINK_ATTEMPTS_AFTER_SAVE = 3;

export type SaveTelegramTokenResult =
  | { ok: true; botUsername: string; startUrl: string }
  | { ok: false; error: string };

/**
 * A fresh "say hi" link. The one that came with the page stops working after a while, so the drawer
 * swaps it for a new one when it opens on that step. `null` when there's nothing to link yet.
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
    const contactId = await prepareOperatorContact(account);
    const channelIdentifier = await ensureTelegramChannel(account);
    const { botUsername } = await saveTelegramBotToken(account, channelIdentifier, token);
    const link = await issueTelegramStartLink(account, channelIdentifier, contactId, {
      attempts: START_LINK_ATTEMPTS_AFTER_SAVE,
    });

    revalidatePath(CHANNELS_PATH);

    return { ok: true, botUsername: link.botUsername || botUsername, startUrl: link.url };
  } catch (error) {
    console.error('Failed to save the Telegram bot token', error);

    return { ok: false, error: describeSaveError(error) };
  }
}

/** Whether the operator has pressed Start in the bot. The drawer asks while it waits. */
export async function checkTelegramConnectedAction(): Promise<boolean> {
  const account = await requireHumanAccount({ returnTo: CHANNELS_PATH });
  const [channelIdentifier, contactId] = await Promise.all([
    findTelegramChannel(account),
    findOperatorContactId(account),
  ]);
  if (!channelIdentifier || !contactId) {
    return false;
  }

  const connected = await hasChannelEndpoint(account, channelIdentifier, contactId);
  if (connected) {
    revalidatePath(CHANNELS_PATH);
  }

  return connected;
}

const INVALID_TOKEN_MESSAGE = 'Token isn’t valid. Copy it again from BotFather; it’s the line after “Use this token”.';

async function findTelegramChannel(account: HumanAccount): Promise<string | undefined> {
  const channels = await listChannels(account);

  return channels.find((channel) => channel.via === 'telegram' && channel.active)?.identifier;
}

/** The operator's own contact, with the relay it's reached through. Both are made on the first setup. */
async function prepareOperatorContact(account: HumanAccount): Promise<string> {
  // A contact that exists keeps its name: the operator may have chosen it in the CLI.
  if (await findOperatorContactId(account)) {
    return ensureOperatorContact(account);
  }

  const user = await currentUser();

  return ensureOperatorContact(account, { firstName: user?.firstName, lastName: user?.lastName });
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
