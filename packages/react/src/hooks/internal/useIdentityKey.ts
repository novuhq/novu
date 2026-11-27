import type { Novu } from '@novu/js';
import { getIdentityKey, subscribeToIdentity } from '@novu/js/internal';
import { useCallback, useSyncExternalStore } from 'react';

export const useIdentityKey = (novu: Novu): string | undefined => {
  const subscribe = useCallback((onChange: () => void) => subscribeToIdentity(novu, onChange), [novu]);
  const getSnapshot = () => getIdentityKey(novu);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};
