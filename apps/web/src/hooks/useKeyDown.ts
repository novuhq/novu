import { useEffect } from 'react';
import { useDataRef } from './useDataRef';

export const useKeyDown = (key: string, callback: () => void) => {
  const callbackRef = useDataRef(callback);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === key) {
        callbackRef.current();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [callbackRef, key]);
};
