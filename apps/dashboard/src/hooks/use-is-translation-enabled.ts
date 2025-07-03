import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { FeatureFlagsKeysEnum, FeatureNameEnum, getFeatureForTierAsBoolean, ApiServiceLevelEnum } from '@novu/shared';
import { IS_SELF_HOSTED } from '@/config';

export const useIsTranslationEnabled = () => {
  const { workflow } = useWorkflow();
  const { subscription } = useFetchSubscription();
  const isFeatureFlagEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_TRANSLATION_ENABLED);

  const isWorkflowToggleEnabled = workflow?.isTranslationEnabled ?? false;

  const canUseTranslationFeature =
    getFeatureForTierAsBoolean(
      FeatureNameEnum.AUTO_TRANSLATIONS,
      subscription?.apiServiceLevel || ApiServiceLevelEnum.FREE
    ) && !IS_SELF_HOSTED;

  const isTranslationEnabled = isFeatureFlagEnabled && isWorkflowToggleEnabled && canUseTranslationFeature;

  return isTranslationEnabled;
};
