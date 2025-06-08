import { useCallback, useEffect, useState } from 'react';

export function useFindDirtyForm() {
  const [isDirty, setIsDirty] = useState(false);
  const [element, setElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!element) return;

    const checkDirty = () => {
      const dirtyFound = element.querySelector('[data-dirty="true"]') !== null;
      setIsDirty(dirtyFound);
    };

    checkDirty();

    const observer = new MutationObserver((mutations) => {
      const shouldCheck = mutations.some((mutation) => mutation.type === 'attributes' || mutation.type === 'childList');

      if (shouldCheck) {
        checkDirty();
      }
    });

    observer.observe(element, {
      attributes: true,
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [element]);

  const ref = useCallback((node: HTMLElement | null) => {
    setElement(node);
  }, []);

  return { isDirty, ref };
}
