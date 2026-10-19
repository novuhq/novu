import debounce from 'lodash.debounce';
import { useCallback, useEffect } from 'react';
import { useDataRef } from './use-data-ref';

export const useDebounce = <Arguments extends any[]>(callback: (...args: Arguments) => void, ms = 0) => {
  const callbackRef = useDataRef(callback);

  const debouncedCallback = useCallback(
    debounce((...args: Arguments) => {
      callbackRef.current(...args);
    }, ms),
    [callbackRef, ms]
  );

  useEffect(() => debouncedCallback.cancel, [debouncedCallback.cancel]);

  return debouncedCallback;
};
