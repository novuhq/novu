import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { IS_ENTERPRISE, IS_SELF_HOSTED } from '@/config';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { ApiServiceLevelEnum, FeatureNameEnum, getFeatureForTierAsBoolean } from '@novu/shared';

export const useIsTranslationEnabled = () => {
  const { workflow } = useWorkflow();
  const { subscription } = useFetchSubscription();

  const isWorkflowToggleEnabled = workflow?.isTranslationEnabled ?? false;

  const canUseTranslationFeature =
    getFeatureForTierAsBoolean(
      FeatureNameEnum.AUTO_TRANSLATIONS,
      subscription?.apiServiceLevel || ApiServiceLevelEnum.FREE
    ) &&
    (!IS_SELF_HOSTED || IS_ENTERPRISE);

  const isTranslationEnabled = isWorkflowToggleEnabled && canUseTranslationFeature;

  return isTranslationEnabled;
};
