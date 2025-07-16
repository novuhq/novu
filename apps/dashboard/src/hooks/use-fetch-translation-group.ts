import { useQuery } from '@tanstack/react-query';
import { useEnvironment } from '@/context/environment/hooks';
import { getTranslationGroup } from '@/api/translations';
import { QueryKeys } from '@/utils/query-keys';
import { LocalizationResourceEnum } from '@/types/translations';

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
