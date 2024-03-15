import { useDebounce } from './useDebounce';

interface IDebouncedFunction {
  (value: string): void;
  cancel: () => void;
}

export const useDebouncedSearch = (setSearch: (newSearch: string) => void): IDebouncedFunction => {
  return useDebounce((value: string) => setSearch(value), 500);
};
