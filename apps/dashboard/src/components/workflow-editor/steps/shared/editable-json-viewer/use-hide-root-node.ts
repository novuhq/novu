import { useEffect } from 'react';

export function useHideRootNode(containerRef: React.RefObject<HTMLDivElement | null>, value: unknown) {
  useEffect(() => {
    const hideRootNodeName = () => {
      const keyTextElements = containerRef.current?.querySelectorAll('.jer-key-text');
      keyTextElements?.forEach((element) => {
        if (element.textContent?.includes('nv-root-node')) {
          (element as HTMLElement).style.display = 'none';
        }
      });
    };

    // Try to hide immediately
    const immediateTimer = setTimeout(hideRootNodeName, 0);

    // Also try after a longer delay to handle timing issues
    const delayedTimer = setTimeout(hideRootNodeName, 100);

    // Set up a MutationObserver to watch for DOM changes
    let observer: MutationObserver | null = null;

    if (containerRef.current) {
      observer = new MutationObserver(() => {
        hideRootNodeName();
      });

      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      clearTimeout(immediateTimer);
      clearTimeout(delayedTimer);
      observer?.disconnect();
    };
  }, [containerRef, value]);
}
