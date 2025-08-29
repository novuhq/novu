import { useQuery } from '@tanstack/react-query';
import { getTranslationsList, TranslationsFilter } from '@/api/translations';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

interface UseFetchTranslationListOptions {
  enabled?: boolean;
}

export const useFetchTranslationList = (filterValues: TranslationsFilter, options: UseFetchTranslationListOptions = {}) => {
  const { enabled = true } = options;
  const { currentEnvironment } = useEnvironment();

  return useQuery({
    queryKey: [QueryKeys.fetchTranslationGroups, filterValues, currentEnvironment?._id],
    queryFn: async () => {
      if (!currentEnvironment) {
        throw new Error('Environment is required');
      }

      return getTranslationsList({
        environment: currentEnvironment,
        ...filterValues,
      });
    },
    enabled: !!currentEnvironment && enabled,
  });
};
