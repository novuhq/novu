import { useCallback, useLayoutEffect, useRef } from 'react';

export const useEvent = <T extends (...args: any[]) => any>(handler: T): T => {
  const handlerRef = useRef<T | null>(null);

  useLayoutEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  return useCallback((...args: Parameters<T>): ReturnType<T> => {
    if (handlerRef.current === null) {
      throw new Error('Handler is not assigned');
    }
    return handlerRef.current(...args);
  }, []) as T;
};
