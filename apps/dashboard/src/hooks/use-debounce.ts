import { debounce } from 'es-toolkit/compat';
import { useCallback, useEffect } from 'react';
import { useDataRef } from './use-data-ref';

export const useDebounce = <Arguments extends any[]>(callback: (...args: Arguments) => void, ms = 0) => {
  const callbackRef = useDataRef(callback);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedCallback = useCallback(debounce(callbackRef.current, ms), [callbackRef, ms]);

  useEffect(() => debouncedCallback.cancel, [debouncedCallback.cancel]);

  return debouncedCallback;
};
