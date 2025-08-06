import { useMemo } from 'react';

export const useVirtualAnchor = (position?: { top: number; left: number }) => {
  return useMemo(() => {
    if (!position) return null;

    return {
      getBoundingClientRect: () =>
        ({
          x: position.left,
          y: position.top,
          top: position.top,
          left: position.left,
          bottom: position.top,
          right: position.left,
          width: 0,
          height: 0,
          toJSON: () => ({}),
        }) as DOMRect,
    };
  }, [position]);
};
