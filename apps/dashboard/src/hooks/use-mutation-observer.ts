import { useLayoutEffect, useRef } from 'react';
import { useDataRef } from './use-data-ref';

type MutationObserverOptions = {
  childList?: boolean;
  attributes?: boolean;
  characterData?: boolean;
  subtree?: boolean;
  attributeOldValue?: boolean;
  characterDataOldValue?: boolean;
  attributeFilter?: string[];
};

type UseMutationObserverProps = {
  target: React.RefObject<Node | null> | Node | null;
  callback: MutationCallback;
  options?: MutationObserverOptions;
};

export function useMutationObserver({
  target,
  callback,
  options = { childList: true, subtree: true },
}: UseMutationObserverProps) {
  const observerRef = useRef<MutationObserver | null>(null);
  const callbackRef = useDataRef<MutationCallback>(callback);

  useLayoutEffect(() => {
    const targetNode = target && 'current' in target ? target.current : target;
    if (!targetNode) return;

    // Create MutationObserver with reference to the latest callback
    const observer = new MutationObserver((mutations, observer) => {
      callbackRef.current(mutations, observer);
    });

    // Store observer in ref
    observerRef.current = observer;

    // Start observing
    observer.observe(targetNode, options);

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [callbackRef, target, options]);

  return observerRef;
}
