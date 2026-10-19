import { TranslationResponseDto } from '@novu/api/models/components';
import { useQuery } from '@tanstack/react-query';
import { getTranslation } from '@/api/translations';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { LocalizationResourceEnum } from '@/types/translations';
import { QueryKeys } from '@/utils/query-keys';

type FetchTranslationParams = {
  resourceId: string;
  resourceType: LocalizationResourceEnum;
  locale: string;
};

export type TranslationWithPlaceholder = TranslationResponseDto & {
  isPlaceholder?: boolean;
};

export const useFetchTranslation = ({ resourceId, resourceType, locale }: FetchTranslationParams) => {
  const { currentEnvironment } = useEnvironment();

  return useQuery({
    queryKey: [QueryKeys.fetchTranslation, resourceId, resourceType, locale, currentEnvironment?._id],
    queryFn: async (): Promise<TranslationWithPlaceholder> => {
      const environment = requireEnvironment(currentEnvironment, 'Environment is required');

      try {
        return await getTranslation({
          environment,
          resourceId,
          resourceType,
          locale,
        });
      } catch (error: any) {
        // If translation doesn't exist (404), return a default structure so users can create it
        if (
          error?.status === 404 ||
          error?.response?.status === 404 ||
          (error instanceof Error && error.message.includes('404'))
        ) {
          return {
            resourceId,
            resourceType,
            locale,
            content: {}, // Empty content for new translations
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isPlaceholder: true, // Flag to indicate this is just a placeholder
          };
        }

        // Re-throw other errors
        throw error;
      }
    },
    enabled: !!currentEnvironment && !!locale && !!resourceId,
    retry: false, // Don't retry 404s
  });
};
