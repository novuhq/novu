import { useQuery } from '@tanstack/react-query';
import { useEnvironment } from '@/context/environment/hooks';
import { getTranslationsList, TranslationsFilter } from '@/api/translations';
import { QueryKeys } from '@/utils/query-keys';

export const useFetchTranslationList = (filterValues: TranslationsFilter) => {
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
    enabled: !!currentEnvironment,
  });
};
