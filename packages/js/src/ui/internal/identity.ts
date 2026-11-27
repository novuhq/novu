import type { Novu } from '../../novu';

/**
 * Names the app, subscriber and context a client is signed in as, or `undefined` until the subscriber is known.
 * Encoded as a JSON tuple: ids may contain any separator, and two different identities must never read alike.
 */
export function getIdentityKey(novu: Novu): string | undefined {
  const { subscriberId } = novu;
  if (subscriberId === undefined) {
    return undefined;
  }

  return JSON.stringify([novu.applicationIdentifier, subscriberId, novu.contextKey]);
}

export function subscribeToIdentity(novu: Novu, onChange: () => void): () => void {
  return novu.on('session.initialize.resolved', onChange);
}
