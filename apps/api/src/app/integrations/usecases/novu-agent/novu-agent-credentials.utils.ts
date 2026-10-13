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
 * On create there is nothing provisioned yet, so every managed field the
 * client sent is dropped. On update, a partial credential save (e.g. the
 * dashboard sends only the subset the user edited) gets the server-stored
 * value re-applied, and an attempt to *change* one is ignored rather than
 * allowed to nuke the integration. `emailSlugPrefix` is the exception: an
 * explicit, valid prefix replaces the stored one.
 */
export function sanitizeAgentInboxCredentialsForCreate(providerId: string, next: ICredentials): ICredentials {
  if (!isAgentInboxProvider(providerId)) {
    return next;
  }

  // Nothing is provisioned yet, so every managed field is the server's to mint.
  const created: ICredentials = { ...next };
  delete created.inboxRoutingKey;
  delete created.secretKey;
  delete created.sharedInboxDisabled;

  if (!hasValidSlugPrefix(created)) {
    delete created.emailSlugPrefix;
  }

  return created;
}

export function mergeAgentInboxCredentialsForUpdate(
  providerId: string,
  next: ICredentials,
  existing: ICredentials | undefined
): ICredentials {
  if (!isAgentInboxProvider(providerId)) {
    return next;
  }

  const merged: ICredentials = { ...next };

  if (existing?.inboxRoutingKey) {
    merged.inboxRoutingKey = existing.inboxRoutingKey;
  } else {
    delete merged.inboxRoutingKey;
  }

  if (existing?.secretKey) {
    merged.secretKey = existing.secretKey;
  }

  // `false` is a real stored value here, so only an absent one is dropped.
  if (existing?.sharedInboxDisabled !== undefined) {
    merged.sharedInboxDisabled = existing.sharedInboxDisabled;
  } else {
    delete merged.sharedInboxDisabled;
  }

  // An explicit, valid prefix is the one managed field the client may change.
  if (!hasValidSlugPrefix(merged)) {
    if (existing?.emailSlugPrefix) {
      merged.emailSlugPrefix = existing.emailSlugPrefix;
    } else {
      delete merged.emailSlugPrefix;
    }
  }

  return merged;
}

function hasValidSlugPrefix(credentials: ICredentials): boolean {
  const slug = credentials.emailSlugPrefix;

  return typeof slug === 'string' && isValidAgentEmailSlugPrefix(slug);
}
