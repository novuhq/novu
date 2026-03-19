import { useCallback, useRef } from 'react';

import { useMutationObserver } from './use-mutation-observer';

export function useRemoveGrammarly<T extends HTMLElement>() {
  const target = useRef<T | null>(null);
  const handleGrammarlyRemoval = useCallback((mutations: MutationRecord[]) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          const isGrammarlyElement =
            node instanceof HTMLElement && node.shadowRoot && node.tagName === 'GRAMMARLY-EXTENSION';

          if (isGrammarlyElement) {
            node.remove();
          }
        }
      }
    }
  }, []);

  useMutationObserver({
    target: target,
    callback: handleGrammarlyRemoval,
    options: { childList: true, subtree: true },
  });

  return target;
}
