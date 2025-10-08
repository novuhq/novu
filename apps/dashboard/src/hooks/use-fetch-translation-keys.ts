import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getTranslation } from '@/api/translations';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchOrganizationSettings } from '@/hooks/use-fetch-organization-settings';
import { LocalizationResourceEnum } from '@/types/translations';
import { QueryKeys } from '@/utils/query-keys';

type FetchTranslationKeysParams = {
  resourceId: string;
  resourceType: LocalizationResourceEnum;
  enabled?: boolean;
};

export const useFetchTranslationKeys = ({ resourceId, resourceType, enabled = true }: FetchTranslationKeysParams) => {
  const { currentEnvironment } = useEnvironment();
  const { data: organizationSettings, isLoading: isOrgSettingsLoading } = useFetchOrganizationSettings();

  const defaultLocale = organizationSettings?.data?.defaultLocale;

  const {
    data: translationData,
    isLoading: isTranslationDataLoading,
    error,
  } = useQuery({
    queryKey: [QueryKeys.fetchTranslationKeys, resourceId, defaultLocale, currentEnvironment?._id],
    queryFn: async () => {
      if (!currentEnvironment || !defaultLocale) {
        throw new Error('Environment and default locale are required');
      }

      try {
        return await getTranslation({
          environment: currentEnvironment,
          resourceId,
          resourceType,
          locale: defaultLocale,
        });
      } catch (error) {
        // If translation doesn't exist, return null instead of throwing
        // This allows the component to work even without translations
        console.debug('No translation found for workflow:', resourceId, 'locale:', defaultLocale);

        return null;
      }
    },
    enabled: !!currentEnvironment && !!defaultLocale && !!resourceId && enabled,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const translationKeys = useMemo(() => {
    if (!translationData?.content) {
      return [];
    }

    // Extract all keys from the translation content (nested keys supported)
    const extractKeys = (obj: Record<string, unknown>, prefix = ''): string[] => {
      const keys: string[] = [];

      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // Recursively extract nested keys
          keys.push(...extractKeys(value as Record<string, unknown>, fullKey));
        } else {
          // This is a leaf node, add the key
          keys.push(fullKey);
        }
      }

      return keys;
    };

    const keys = extractKeys(translationData.content);

    // Return in the format expected by the suggestion system
    return keys.map((key) => ({ name: key }));
  }, [translationData?.content]);

  // Overall loading state - we're loading if either org settings or translation data is loading
  const isLoading = isOrgSettingsLoading || isTranslationDataLoading;

  return {
    translationKeys,
    isLoading,
    error,
    defaultLocale,
    hasTranslations: translationKeys.length > 0,
    translationData,
  };
};
