import { useQuery } from '@tanstack/react-query';
import { getTranslationGroup } from '@/api/translations';
import { useEnvironment } from '@/context/environment/hooks';
import { LocalizationResourceEnum } from '@/types/translations';
import { QueryKeys } from '@/utils/query-keys';

export const useFetchTranslationGroup = ({
  resourceId,
  resourceType,
  enabled = true,
}: {
  resourceId: string;
  resourceType: LocalizationResourceEnum;
  enabled?: boolean;
}) => {
  const { currentEnvironment } = useEnvironment();

  return useQuery({
    queryKey: [QueryKeys.fetchTranslationGroup, resourceId, resourceType, currentEnvironment?._id],
    queryFn: async () => {
      if (!currentEnvironment) {
        throw new Error('Environment is required');
      }

      return getTranslationGroup({
        environment: currentEnvironment,
        resourceId,
        resourceType,
      });
    },
    enabled: !!currentEnvironment && !!resourceId && !!resourceType && enabled,
  });
};
