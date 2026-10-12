import { isValidAgentEmailSlugPrefix } from '@novu/application-generic';
import { type ICredentials, isAgentInboxProvider } from '@novu/shared';

/**
 * The NovuAgent integration owns a handful of routing-control fields that a
 * partial credential save must not drop:
 *
 * - `inboxRoutingKey`     — opaque routing segment of the shared-inbox
 *                           address. Backed by a partial unique index;
 *                           rotating it is the moral equivalent of changing
 *                           the integration's email address and should only
 *                           happen through an explicit server-side flow.
 * - `secretKey`           — HMAC secret used to sign inbound webhook
 *                           payloads. Same property as on other agent
 *                           providers: minted at provision time and never
 *                           re-supplied by the client.
 * - `sharedInboxDisabled` — kill switch for the Novu shared inbox. Mutated
 *                           only via `PATCH /agents/:identifier/inbox/shared`
 *                           so the server can refuse to leave the agent with
 *                           zero inbound addresses.
 * - `emailSlugPrefix`     — user-editable half of the shared-inbox address.
 *                           A partial credential save that omits it must not
 *                           drop the stored prefix: the published address
 *                           would fall back to the agent slug while inbound
 *                           routing still expects the prefix that was sent.
 *
 * If the incoming credentials drop any of these fields (e.g. the dashboard
 * sends the subset that the user actually edited), we re-apply the server-
 * stored value. For `emailSlugPrefix`, an explicit valid prefix replaces the
 * stored one. If the client tries to *change* the other values, we ignore
 * the change and keep the existing one — saves us from a malformed input
 * nuking the integration.
 */
export function ensureNovuAgentManagedCredentials({
  providerId,
  nextCredentials,
  existingCredentials,
  stripClientSecret = false,
}: {
  providerId: string;
  nextCredentials: ICredentials;
  existingCredentials?: ICredentials;
  /** Create path: a client must not choose the webhook HMAC secret. */
  stripClientSecret?: boolean;
}): ICredentials {
  if (!isAgentInboxProvider(providerId)) {
    return nextCredentials;
  }

  const merged: ICredentials = { ...nextCredentials };

  if (existingCredentials?.inboxRoutingKey) {
    merged.inboxRoutingKey = existingCredentials.inboxRoutingKey;
  } else {
    delete merged.inboxRoutingKey;
  }

  if (existingCredentials?.secretKey) {
    merged.secretKey = existingCredentials.secretKey;
  } else if (stripClientSecret) {
    delete merged.secretKey;
  }

  if (existingCredentials?.sharedInboxDisabled !== undefined) {
    merged.sharedInboxDisabled = existingCredentials.sharedInboxDisabled;
  } else {
    delete merged.sharedInboxDisabled;
  }

  const incomingSlug = merged.emailSlugPrefix;
  if (!(typeof incomingSlug === 'string' && isValidAgentEmailSlugPrefix(incomingSlug))) {
    if (existingCredentials?.emailSlugPrefix) {
      merged.emailSlugPrefix = existingCredentials.emailSlugPrefix;
    } else {
      delete merged.emailSlugPrefix;
    }
  }

  return merged;
}
