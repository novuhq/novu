import { useEffect } from 'react';

export const useOnElementUnmount = (props: {
  element?: HTMLElement | null;
  callback: () => void;
  condition?: boolean;
}) => {
  const { element, callback } = props;

  useEffect(() => {
    if (!element || !element.parentNode) return;

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // Check if the element is among the removed nodes.
        mutation.removedNodes.forEach((removedNode) => {
          if (removedNode === element) {
            callback();
          }
        });
      }
    });

    // Observe the parent node for changes in its children.
    observer.observe(element.parentNode, { childList: true });

    // Cleanup on unmount.
    return () => observer.disconnect();
  }, [callback, element]);
};
