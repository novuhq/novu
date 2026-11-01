'use client';

import { useEffect, useState } from 'react';

/**
 * The width of an element as it changes, so a parent of a set width can animate to it, as `useMeasuredHeight`
 * does for heights. Give `ref` to the element that holds the content; `width` is `undefined` until it has
 * been measured.
 */
export function useMeasuredWidth() {
  // State, not a ref object: the element is swapped for a new one whenever its words change.
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [width, setWidth] = useState<number>();

  useEffect(() => {
    if (!element) {
      return;
    }

    const observer = new ResizeObserver(() => setWidth(element.offsetWidth));
    observer.observe(element);

    return () => observer.disconnect();
  }, [element]);

  return { ref: setElement, width };
}
