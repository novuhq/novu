import 'server-only';

import type { HumanAccount } from './human-account';
import { HumanApiError } from './human-api-error';
import { type Channel, hasChannelEndpoint, issueTelegramStartLink } from './human-channels-api';

/** Where the Telegram drawer opens: at the first step, at "say hi", or already done. */
export type TelegramSetupState =
  | { step: 'create' }
  | { step: 'start'; botUsername: string; startUrl: string }
  | { step: 'connected'; botUsername: string };

/**
 * How far the Telegram setup got, read with the Channels page so the drawer opens on it at once.
 * Nothing is created here: without a channel or an operator contact the setup simply hasn't started.
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
    // No link means the channel has no working bot token yet, or Telegram can't be asked right now.
    issueTelegramStartLink(account, channel.identifier, operatorContactId).catch((error: unknown) => {
      if (error instanceof HumanApiError) {
        return null;
      }

      throw error;
    }),
    hasChannelEndpoint(account, channel.identifier, operatorContactId),
  ]);

  if (linked) {
    return { step: 'connected', botUsername: link?.botUsername ?? '' };
  }

  return link ? { step: 'start', botUsername: link.botUsername, startUrl: link.url } : { step: 'create' };
}
