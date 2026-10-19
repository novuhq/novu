import { useEffect, useState } from 'react';
import { useDataRef } from './use-data-ref';

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const oldValueRef = useDataRef(debouncedValue);

  useEffect(() => {
    const timer = setTimeout(() => {
      const oldValue = JSON.stringify(oldValueRef.current);
      const newValue = JSON.stringify(value);
      if (oldValue === newValue) return;

      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay, oldValueRef]);

  return debouncedValue;
}
