import { useCallback, useEffect, useRef } from 'react';
import debounce from 'lodash.debounce';

export const useDebounce = <Arguments = unknown | unknown[]>(callback: (args: Arguments) => void, ms = 0) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const debouncedCallback = useCallback(debounce(callbackRef.current, ms), [ms]);

  useEffect(() => debouncedCallback.cancel, []);

  return debouncedCallback;
};
