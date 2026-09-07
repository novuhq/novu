import { ApiServiceLevelEnum, FeatureNameEnum, getFeatureForTierAsBoolean } from '@novu/shared';
import { IS_SELF_HOSTED_CE } from '@/config';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';

export function useIsAgentEmailAvailable(): boolean {
  const { subscription } = useFetchSubscription();

  if (IS_SELF_HOSTED_CE) {
    return false;
  }

  return getFeatureForTierAsBoolean(
    FeatureNameEnum.AGENT_EMAIL_INTEGRATION,
    subscription?.apiServiceLevel ?? ApiServiceLevelEnum.FREE
  );
}
