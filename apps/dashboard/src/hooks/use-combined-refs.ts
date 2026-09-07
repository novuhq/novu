import { ForwardedRef, useCallback } from 'react';

type CallbackRef<T> = ((node: T | null) => void) | ForwardedRef<T>;

export function useCombinedRefs<T>(...refs: CallbackRef<T>[]) {
  return useCallback((element: T | null) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        ref.current = element;
      }
    });
  }, refs);
}
