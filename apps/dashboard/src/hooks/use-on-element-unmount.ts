import { useCallback, useRef } from 'react';
import { useDataRef } from './use-data-ref';

export const useOnElementUnmount = (props: { callback: () => void; condition: boolean }) => {
  const { callback, condition } = props;
  const callbackRef = useDataRef(callback);
  const hasCalledCallback = useRef(false);

  const ref = useCallback(
    (element: HTMLElement | null) => {
      if (!element) {
        return;
      }

      // Reset flag when element is mounted
      hasCalledCallback.current = false;

      const observer = new MutationObserver(() => {
        if (hasCalledCallback.current) return;

        // Check if element is still in DOM
        if (!element.isConnected && condition) {
          hasCalledCallback.current = true;
          observer.disconnect();
          callbackRef.current();
        }
      });

      observer.observe(element.parentNode!, { childList: true });
    },
    [callbackRef, condition]
  );

  return { ref };
};
