import { ApiServiceLevelEnum, FeatureNameEnum, getFeatureForTierAsBoolean } from '@novu/shared';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';

export function useIsAgentEmailAvailable(): boolean {
  const { subscription } = useFetchSubscription();

  return getFeatureForTierAsBoolean(
    FeatureNameEnum.AGENT_EMAIL_INTEGRATION,
    subscription?.apiServiceLevel ?? ApiServiceLevelEnum.FREE
  );
}
