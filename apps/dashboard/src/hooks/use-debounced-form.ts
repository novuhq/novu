import { useEffect } from 'react';
import { FieldValues, UseFormWatch } from 'react-hook-form';
import { useDebounce } from './use-debounce';

export function useDebouncedForm<T extends FieldValues>(
  watch: UseFormWatch<T>,
  callback: (data: T) => void,
  delay: number = 400
) {
  const debouncedCallback = useDebounce(callback, delay);

  useEffect(() => {
    const subscription = watch((data) => {
      debouncedCallback(data as T);
    });

    return () => subscription.unsubscribe();
  }, [watch, debouncedCallback]);
}
