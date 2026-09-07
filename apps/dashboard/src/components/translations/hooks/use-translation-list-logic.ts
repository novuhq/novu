import { useFetchTranslationList } from '@/hooks/use-fetch-translation-list';
import { useTranslationsUrlState } from './use-translations-url-state';

interface UseTranslationListLogicOptions {
  enabled?: boolean;
}

export function useTranslationListLogic(options: UseTranslationListLogicOptions = {}) {
  const { enabled = true } = options;
  
  const { filterValues, handleFiltersChange, resetFilters } = useTranslationsUrlState({
    total: 0,
  });

  const { data, isPending, isFetching, refetch } = useFetchTranslationList(filterValues, { enabled });

  const areFiltersApplied = filterValues.query !== '';

  return {
    filterValues,
    handleFiltersChange,
    resetFilters,
    data,
    isPending,
    isFetching,
    refetch,
    areFiltersApplied,
  };
}
