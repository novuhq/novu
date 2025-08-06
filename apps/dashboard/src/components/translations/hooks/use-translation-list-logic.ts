import { useFetchTranslationList } from '@/hooks/use-fetch-translation-list';
import { useTranslationsUrlState } from './use-translations-url-state';

export function useTranslationListLogic() {
  const { filterValues, handleFiltersChange, resetFilters } = useTranslationsUrlState({
    total: 0,
  });

  const { data, isPending, isFetching, refetch } = useFetchTranslationList(filterValues);

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
