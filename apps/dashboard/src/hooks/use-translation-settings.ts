import { useQuery } from '@tanstack/react-query';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { getTranslationSettings, TranslationSettingsDto } from '../api/translation-settings';

/**
 * Hook to fetch translation settings for the current organization
 *
 * Returns the translation settings including model, locales, and API key status.
 * The actual API key is never exposed - only presence flag and last 4 chars.
 *
 * @returns Query result with translation settings or null if not configured
 */
export function useTranslationSettings() {
  const { currentEnvironment } = useEnvironment();

  return useQuery<TranslationSettingsDto | null>({
    queryKey: [QueryKeys.translationSettings, currentEnvironment?._id],
    queryFn: async () => {
      return getTranslationSettings({ environment: currentEnvironment! });
    },
    enabled: !!currentEnvironment?._id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
