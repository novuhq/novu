import { useEffect } from 'react';

export function useHideRootNode(containerRef: React.RefObject<HTMLDivElement>, value: unknown) {
  useEffect(() => {
    const hideRootNodeName = () => {
      const keyTextElements = containerRef.current?.querySelectorAll('.jer-key-text');
      keyTextElements?.forEach((element) => {
        if (element.textContent?.includes('nv-root-node')) {
          (element as HTMLElement).style.display = 'none';
        }
      });
    };

    const timer = setTimeout(hideRootNodeName, 0);

    return () => clearTimeout(timer);
  }, [containerRef, value]);
}
