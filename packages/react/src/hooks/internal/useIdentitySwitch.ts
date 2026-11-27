import type { Novu } from '@novu/js';
import { subscribeToIdentitySwitch } from '@novu/js/internal';
import { useEffect } from 'react';
import { useDataRef } from './useDataRef';

/** Runs `onSwitch` when another subscriber or context signs in on `novu`, for example after a logout and login. */
export const useIdentitySwitch = (novu: Novu, onSwitch: () => void): void => {
  const onSwitchRef = useDataRef(onSwitch);

  useEffect(() => subscribeToIdentitySwitch(novu, () => onSwitchRef.current()), [novu, onSwitchRef]);
};
