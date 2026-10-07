import 'server-only';

import type { HumanAccount } from './human-account';
import { HumanApiError } from './human-api-error';
import { type Channel, hasChannelEndpoint, issueTelegramStartLink } from './human-channels-api';

/**
 * Where the Telegram drawer opens: at the first step, at "say hi", or already done. `unknown` means it
 * couldn't be read just now (the API or Telegram didn't answer); the drawer then asks again itself.
 */
export type TelegramSetupState =
  | { step: 'create' }
  | { step: 'start'; botUsername: string; startUrl: string }
  | { step: 'connected'; botUsername: string }
  | { step: 'unknown' };

/**
 * How far the Telegram setup got, read with the Channels page so the drawer opens on it at once.
 * Nothing is created here: without a channel or an operator contact the setup simply hasn't started.
 * A failed read never fails the page; it comes back as `unknown`.
 */
export async function readTelegramSetup(
  account: HumanAccount,
  channel: Channel | undefined,
  operatorContactId: string | null
): Promise<TelegramSetupState> {
  if (!channel || !operatorContactId) {
    return { step: 'create' };
  }

  const [link, linked] = await Promise.all([
    issueTelegramStartLink(account, channel.identifier, operatorContactId).catch((error: unknown) => {
      // The API turns the link down while the channel has no working bot token: the setup hasn't got that far.
      return isRefusal(error) ? ('no-token' as const) : unreadable(error);
    }),
    hasChannelEndpoint(account, channel.identifier, operatorContactId).catch(unreadable),
  ]);

  if (linked === true) {
    return { step: 'connected', botUsername: typeof link === 'object' ? link.botUsername : '' };
  }

  if (linked === 'unreadable' || link === 'unreadable') {
    return { step: 'unknown' };
  }

  return link === 'no-token'
    ? { step: 'create' }
    : { step: 'start', botUsername: link.botUsername, startUrl: link.url };
}

function isRefusal(error: unknown): boolean {
  return error instanceof HumanApiError && error.status >= 400 && error.status < 500;
}

/** An answer the API couldn't give is not a reason to fail; anything else is a bug and keeps going. */
function unreadable(error: unknown): 'unreadable' {
  if (error instanceof HumanApiError) {
    return 'unreadable';
  }

  throw error;
}
