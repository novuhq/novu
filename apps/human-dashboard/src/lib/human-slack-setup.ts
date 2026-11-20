import 'server-only';

import type { HumanAccount } from './human-account';
import { HumanApiError, isHumanApiRefusal } from './human-api-error';
import { type Channel, findSlackWorkspace, hasLinkedChannel, issueSlackInstallUrl } from './human-channels-api';

/**
 * Where the Slack drawer opens: at the first step, at the install, or already done. `unknown` means it
 * couldn't be read just now (the API didn't answer); the drawer then asks again itself.
 */
export type SlackSetupState =
  | { step: 'name' }
  | { step: 'install'; appName: string }
  | { step: 'connected'; appName: string; workspace?: string; connectedAt?: string }
  | { step: 'unknown' };

/**
 * How far the Slack setup got, read with the Channels page so the drawer opens on it at once.
 * Nothing is created here: without a channel or an operator contact the setup simply hasn't started.
 * A failed read never fails the page; it comes back as `unknown`.
 */
export async function readSlackSetup(
  account: HumanAccount,
  channel: Channel | undefined,
  operatorContactId: string | null
): Promise<SlackSetupState> {
  if (!channel || !operatorContactId) {
    return { step: 'name' };
  }

  const appName = channel.name ?? '';

  if (channel.connected) {
    // Another contact can have linked Slack before the operator did; the operator still has their install to do.
    const linked = await hasLinkedChannel(account, channel.identifier, operatorContactId).catch((error: unknown) => {
      // An answer the API couldn't give is not a reason to fail the page; anything else is a bug and keeps going.
      if (!(error instanceof HumanApiError)) {
        throw error;
      }

      return 'unreadable' as const;
    });

    if (linked === 'unreadable') {
      return { step: 'unknown' };
    }

    if (linked) {
      // The workspace's name is a nicety: the drawer still says "connected" when it can't be read.
      const workspace = await findSlackWorkspace(account, channel.identifier).catch(() => undefined);

      return { step: 'connected', appName, workspace: workspace?.name, connectedAt: workspace?.connectedAt };
    }
  }

  // Only a channel that has its app can make an install link, so asking for one tells the two apart.
  const hasApp = await issueSlackInstallUrl(account, channel.identifier, operatorContactId).then(
    () => true,
    (error: unknown) => {
      // An answer the API couldn't give is not a reason to fail; anything else is a bug and keeps going.
      if (!(error instanceof HumanApiError)) {
        throw error;
      }

      return isHumanApiRefusal(error) ? false : ('unreadable' as const);
    }
  );

  if (hasApp === 'unreadable') {
    return { step: 'unknown' };
  }

  return hasApp ? { step: 'install', appName } : { step: 'name' };
}
