import { ApiServiceLevelEnum, FeatureNameEnum, getFeatureForTierAsBoolean } from '@novu/shared';
import { IS_SELF_HOSTED } from '@/config';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { useTranslationSettings } from '@/hooks/use-translation-settings';

/**
 * Hook to check if translation feature is enabled
 *
 * For cloud (Novu):
 * - Requires appropriate tier/subscription
 *
 * For self-hosted (ReNovu):
 * - Requires OpenAI API key to be configured
 *
 * @param options.isTranslationEnabledOnResource - Whether the specific resource has translations enabled
 * @returns Whether translations are enabled for the resource
 */
export const useIsTranslationEnabled = ({
  isTranslationEnabledOnResource = false,
}: {
  isTranslationEnabledOnResource?: boolean;
} = {}) => {
  const { subscription } = useFetchSubscription();
  const { data: translationSettings } = useTranslationSettings();

  // For self-hosted (ReNovu): check if OpenAI API key is configured
  const hasOpenAIKeyConfigured = translationSettings?.hasApiKey ?? false;

  // For cloud (Novu): check tier/subscription features
  const hasCloudFeatureAccess = getFeatureForTierAsBoolean(
    FeatureNameEnum.AUTO_TRANSLATIONS,
    subscription?.apiServiceLevel || ApiServiceLevelEnum.FREE
  );

  // Determine if the translation feature can be used:
  // - Self-hosted: requires OpenAI API key
  // - Cloud: requires tier/subscription (or also accepts OpenAI key as override)
  const canUseTranslationFeature = IS_SELF_HOSTED
    ? hasOpenAIKeyConfigured
    : hasCloudFeatureAccess || hasOpenAIKeyConfigured;

  const isTranslationEnabled = isTranslationEnabledOnResource && canUseTranslationFeature;

  return isTranslationEnabled;
};
