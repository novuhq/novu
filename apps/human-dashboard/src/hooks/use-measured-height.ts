'use client';

import { useEffect, useState } from 'react';

/**
 * The height of an element as it changes, so a fixed-height parent can animate to it. Give `ref` to the
 * element that holds the content; `height` is `undefined` until it has been measured.
 */
export function useMeasuredHeight() {
  // State, not a ref object: the element may only exist some of the time, such as while a dialog is open.
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number>();

  useEffect(() => {
    if (!element) {
      setHeight(undefined);

      return;
    }

    const observer = new ResizeObserver(() => setHeight(element.offsetHeight));
    observer.observe(element);

    return () => observer.disconnect();
  }, [element]);

  return { ref: setElement, height };
}
