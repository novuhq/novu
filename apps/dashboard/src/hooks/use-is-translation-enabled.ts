import { ApiServiceLevelEnum, FeatureNameEnum, getFeatureForTierAsBoolean } from '@novu/shared';
import { IS_SELF_HOSTED_CE } from '@/config';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';

export const useIsTranslationEnabled = ({
  isTranslationEnabledOnResource = false,
}: {
  isTranslationEnabledOnResource?: boolean;
} = {}) => {
  const { subscription } = useFetchSubscription();

  const canUseTranslationFeature =
    getFeatureForTierAsBoolean(
      FeatureNameEnum.AUTO_TRANSLATIONS,
      subscription?.apiServiceLevel || ApiServiceLevelEnum.FREE
    ) && !IS_SELF_HOSTED_CE;

  const isTranslationEnabled = isTranslationEnabledOnResource && canUseTranslationFeature;

  return isTranslationEnabled;
};
