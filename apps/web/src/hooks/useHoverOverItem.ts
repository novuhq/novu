import { useRef, useState } from 'react';

interface IProps {
  enterDelay?: number;
}

export const useHoverOverItem = <T>(props: IProps = {}) => {
  const [item, setItem] = useState<T | undefined>(undefined);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enterDelay = props.enterDelay || props.enterDelay === 0 ? props.enterDelay : 500;

  const onMouseEnter = (newItem?: T) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setItem(newItem);
    }, enterDelay);
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
