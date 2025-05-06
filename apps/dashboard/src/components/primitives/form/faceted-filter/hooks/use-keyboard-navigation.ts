import { useEffect, useState } from 'react';
import { FilterOption } from '../types';

interface UseKeyboardNavigationProps {
  options: FilterOption[];
  onSelect: (value: string) => void;
  initialSelectedValue?: string;
}

export function useKeyboardNavigation({ options, onSelect, initialSelectedValue }: UseKeyboardNavigationProps) {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (options.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) => (prev < options.length - 1 ? prev + 1 : prev));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case 'Enter':
          e.preventDefault();

          if (focusedIndex >= 0 && focusedIndex < options.length) {
            onSelect(options[focusedIndex].value);
          }

          break;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, options, onSelect]);

  // Initialize focusedIndex based on selected value
  useEffect(() => {
    if (initialSelectedValue) {
      const index = options.findIndex((option) => option.value === initialSelectedValue);

      if (index !== -1) {
        setFocusedIndex(index);
      }
    }
  }, [initialSelectedValue, options]);

  return {
    focusedIndex,
    setFocusedIndex,
  };
}
