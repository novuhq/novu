import { useQuery } from '@tanstack/react-query';
import { LocalizationResourceEnum } from '@/components/translations/types';
import { useEnvironment } from '@/context/environment/hooks';
import { getTranslation } from '@/api/translations';
import { QueryKeys } from '@/utils/query-keys';

type FetchTranslationParams = {
  resourceId: string;
  resourceType: LocalizationResourceEnum;
  locale: string;
};

export const useFetchTranslation = ({ resourceId, resourceType, locale }: FetchTranslationParams) => {
  const { currentEnvironment } = useEnvironment();

  return useQuery({
    queryKey: [QueryKeys.fetchTranslation, resourceId, resourceType, locale, currentEnvironment?._id],
    queryFn: async () => {
      if (!currentEnvironment) {
        throw new Error('Environment is required');
      }

      return getTranslation({
        environment: currentEnvironment,
        resourceId,
        resourceType,
        locale,
      });
    },
    enabled: !!currentEnvironment && !!locale && !!resourceId,
  });
};
