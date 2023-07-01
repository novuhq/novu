import { useRef, useState } from 'react';

export const useHoverOverItem = <T>() => {
  const [item, setItem] = useState<T | undefined>(undefined);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onMouseEnter = (newItem?: T) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setItem(newItem);
    }, 500);
  };

  const onMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setItem(undefined);
  };

  return {
    item,
    onMouseEnter,
    onMouseLeave,
  };
};
