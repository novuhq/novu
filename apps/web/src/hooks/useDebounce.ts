import { useCallback, useEffect } from 'react';
import debounce from 'lodash.debounce';

import { useDataRef } from '@novu/shared-web';

export const useDebounce = <Arguments = unknown | unknown[]>(callback: (args: Arguments) => void, ms = 0) => {
  const callbackRef = useDataRef(callback);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedCallback = useCallback(debounce(callbackRef.current, ms), [callbackRef, ms]);

  useEffect(() => debouncedCallback.cancel, [debouncedCallback.cancel]);

  return debouncedCallback;
};
