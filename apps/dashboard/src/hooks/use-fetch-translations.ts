import { useQuery } from '@tanstack/react-query';
import { useEnvironment } from '@/context/environment/hooks';
import { getTranslations } from '@/api/translations';
import { QueryKeys } from '@/utils/query-keys';
import { LocalizationResourceEnum } from '@/components/translations/types';

export type FetchTranslationsParams = {
  resourceId: string;
  resourceType: LocalizationResourceEnum;
  locale?: string;
  enabled?: boolean;
};

export const useFetchTranslations = (params: FetchTranslationsParams) => {
  const { currentEnvironment } = useEnvironment();

  return useQuery({
    queryKey: [QueryKeys.fetchTranslations, params, currentEnvironment?._id],
    queryFn: async () => {
      if (!currentEnvironment) {
        throw new Error('Environment is required');
      }

      return getTranslations({
        environment: currentEnvironment,
        ...params,
      });
    },
    enabled: !!currentEnvironment && !!params.resourceId && !!params.resourceType && !!params.enabled,
  });
};
