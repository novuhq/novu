import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TranslationsFilter } from '@/api/translations';
import { DEFAULT_TRANSLATIONS_LIMIT, DEFAULT_TRANSLATIONS_OFFSET } from '../constants';

export const defaultTranslationsFilter: TranslationsFilter = {
  query: '',
  limit: DEFAULT_TRANSLATIONS_LIMIT,
  offset: DEFAULT_TRANSLATIONS_OFFSET,
};

export type TranslationsUrlState = {
  filterValues: TranslationsFilter;
  handleFiltersChange: (newFilters: Partial<TranslationsFilter>) => void;
  resetFilters: () => void;
  handleNext: () => void;
  handlePrevious: () => void;
  handleFirst: () => void;
};

type UseTranslationsUrlStateProps = {
  total?: number;
  limit?: number;
};

export function useTranslationsUrlState({
  total = 0,
  limit = DEFAULT_TRANSLATIONS_LIMIT,
}: UseTranslationsUrlStateProps): TranslationsUrlState {
  const [searchParams, setSearchParams] = useSearchParams();

  const filterValues = useMemo(() => {
    const query = searchParams.get('query') || '';
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    return {
      query,
      limit,
      offset,
    };
  }, [searchParams, limit]);

  const handleFiltersChange = useCallback(
    (newFilters: Partial<TranslationsFilter>) => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);

        Object.entries(newFilters).forEach(([key, value]) => {
          if (value === '' || value === undefined) {
            newParams.delete(key);
          } else {
            newParams.set(key, String(value));
          }
        });

        // Reset offset when filters change (except when offset is being set)
        if (!('offset' in newFilters)) {
          newParams.delete('offset');
        }

        return newParams;
      });
    },
    [setSearchParams]
  );

  const resetFilters = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  const handleNext = useCallback(() => {
    const nextOffset = filterValues.offset + limit;

    if (nextOffset < total) {
      handleFiltersChange({ offset: nextOffset });
    }
  }, [filterValues.offset, limit, total, handleFiltersChange]);

  const handlePrevious = useCallback(() => {
    const prevOffset = Math.max(0, filterValues.offset - limit);
    handleFiltersChange({ offset: prevOffset });
  }, [filterValues.offset, limit, handleFiltersChange]);

  const handleFirst = useCallback(() => {
    handleFiltersChange({ offset: 0 });
  }, [handleFiltersChange]);

  return {
    filterValues,
    handleFiltersChange,
    resetFilters,
    handleNext,
    handlePrevious,
    handleFirst,
  };
}
