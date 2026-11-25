import type { Novu } from '../../novu';

export function getIdentityKey(novu: Novu): string | undefined {
  const { subscriberId } = novu;
  if (subscriberId === undefined) {
    return undefined;
  }

  return `a=${novu.applicationIdentifier}:s=${subscriberId}:c=${novu.contextKey}`;
}

export function subscribeToIdentity(novu: Novu, onChange: () => void): () => void {
  return novu.on('session.initialize.resolved', onChange);
}
