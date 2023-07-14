import { useEffect } from 'react';

export const useKeyDown = (key: string, callback: () => void) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === key) {
        callback();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [callback]);
};
