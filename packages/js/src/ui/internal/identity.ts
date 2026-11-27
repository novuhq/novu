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

/**
 * Calls `onSwitch` when another subscriber or context signs in on `novu` than the one before, so a view can drop the
 * data it shows. The first sign-in is not a switch.
 */
export function subscribeToIdentitySwitch(novu: Novu, onSwitch: () => void): () => void {
  let signedInAs = getIdentityKey(novu);

  return subscribeToIdentity(novu, () => {
    const identityKey = getIdentityKey(novu);
    if (identityKey === undefined || identityKey === signedInAs) {
      return;
    }
    const switched = signedInAs !== undefined;
    signedInAs = identityKey;
    if (switched) {
      onSwitch();
    }
  });
}
