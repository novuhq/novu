import type { StorageService } from '@novu/application-generic';

import { resolveHumanDashboardBaseUrl } from '../../shared/helpers/resolve-human-dashboard-base-url';
import { type MascotLook, mascotPictureUrl } from './agent-picture-url';

/** A small file on the Agent Inbox dashboard: a setup doesn't wait long for something this optional. */
const DEFAULT_PICTURE_TIMEOUT_MS = 5_000;

/**
 * The picture a relay agent puts on a channel's own profile (a Telegram bot, a WhatsApp business number).
 *
 * A picture kept in file storage. `null` is for an agent whose own picture was taken away: the default one goes
 * there instead. `'default-if-none'` is for an agent with no picture: the default one goes only on a profile with
 * no photo at all, so a photo set by hand on the channel stays.
 */
export type AgentProfilePicture = { storageKey: string; contentType: string } | null | 'default-if-none';

/**
 * The agent's own picture, or one from the Agent Inbox dashboard: its mascot in the look its mascots show, else
 * the default picture.
 */
export async function readAgentProfilePicture(
  storageService: Pick<StorageService, 'getFile'>,
  picture: AgentProfilePicture,
  mascot: MascotLook | null | undefined
): Promise<{ file: Buffer; contentType: string }> {
  if (picture && picture !== 'default-if-none') {
    return { file: await storageService.getFile(picture.storageKey), contentType: picture.contentType };
  }

  const address = mascot ? mascotPictureUrl(mascot, 'jpg') : `${resolveHumanDashboardBaseUrl()}/brand/agent-avatar.jpg`;

  // Unlike the calls to the channels this one follows redirects: with no address set it asks agentinbox.md,
  // which sends everyone to www, and it carries no token.
  const response = await fetch(address, {
    signal: AbortSignal.timeout(DEFAULT_PICTURE_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`The default picture answered with status ${response.status}.`);
  }

  return { file: Buffer.from(await response.arrayBuffer()), contentType: 'image/jpeg' };
}
