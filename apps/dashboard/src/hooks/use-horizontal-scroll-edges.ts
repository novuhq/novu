import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_FADE_WIDTH_PX = 32;

/**
 * Builds a horizontal mask gradient that fades out the edges with overflowing content.
 * Returns `undefined` when neither edge has overflow, so consumers can drop the mask
 * style entirely and keep the content fully opaque.
 */
export function buildEdgeFadeMask(
  canScrollLeft: boolean,
  canScrollRight: boolean,
  fadeWidthPx: number = DEFAULT_FADE_WIDTH_PX
): string | undefined {
  if (!canScrollLeft && !canScrollRight) return undefined;

  const leftStop = canScrollLeft ? `transparent 0, black ${fadeWidthPx}px` : 'black 0';
  const rightStop = canScrollRight ? `black calc(100% - ${fadeWidthPx}px), transparent 100%` : 'black 100%';

  return `linear-gradient(to right, ${leftStop}, ${rightStop})`;
}

/**
 * Tracks whether a horizontally scrollable container can scroll further left or right,
 * and exposes a `scrollBy` helper that advances by ~80% of the visible width.
 *
 * Reacts to viewport resizes, children being added/removed, and individual child size
 * changes so the edges stay accurate when content reflows.
 */
export function useHorizontalScrollEdges<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [edges, setEdges] = useState({ canScrollLeft: false, canScrollRight: false });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const update = () => {
      const canScrollLeft = node.scrollLeft > 1;
      const canScrollRight = node.scrollLeft + node.clientWidth < node.scrollWidth - 1;

      setEdges((prev) =>
        prev.canScrollLeft === canScrollLeft && prev.canScrollRight === canScrollRight
          ? prev
          : { canScrollLeft, canScrollRight }
      );
    };

    update();
    node.addEventListener('scroll', update, { passive: true });

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(node);

    const observeChildren = () => {
      for (const child of Array.from(node.children)) {
        resizeObserver.observe(child);
      }
    };

    observeChildren();

    const mutationObserver = new MutationObserver(() => {
      observeChildren();
      update();
    });
    mutationObserver.observe(node, { childList: true });

    return () => {
      node.removeEventListener('scroll', update);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  const scrollBy = useCallback((direction: 'left' | 'right') => {
    const node = ref.current;
    if (!node) return;

    const delta = Math.max(node.clientWidth * 0.8, 160);
    node.scrollBy({ left: direction === 'right' ? delta : -delta, behavior: 'smooth' });
  }, []);

  return { ref, ...edges, scrollBy };
}
