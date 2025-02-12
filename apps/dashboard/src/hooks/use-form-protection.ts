import { useBeforeUnload } from '@/hooks/use-before-unload';
import { useEffect, useState } from 'react';

export function useFormProtection(ref: React.RefObject<HTMLElement>) {
  const [isDirty, setIsDirty] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  useBeforeUnload(isDirty);

  useEffect(() => {
    if (!ref.current) {
      const documentObserver = new MutationObserver(() => {
        if (ref.current) {
          documentObserver.disconnect();
          setupElementObserver(ref.current);
        }
      });

      documentObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });

      return () => {
        documentObserver.disconnect();
      };
    }

    return setupElementObserver(ref.current);
  }, [ref]);

  function setupElementObserver(element: HTMLElement) {
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
  }

  return { isFormDirty: isDirty, showAlert, setShowAlert };
}
