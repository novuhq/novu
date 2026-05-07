import { ApiServiceLevelEnum, FeatureNameEnum, getFeatureForTierAsBoolean } from '@novu/shared';
import { ALLOW_AGENT_EMAIL_TIER_BYPASS } from '@/config';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';

export function useIsAgentEmailAvailable(): boolean {
  const { subscription } = useFetchSubscription();

  if (ALLOW_AGENT_EMAIL_TIER_BYPASS) {
    return true;
  }

  return getFeatureForTierAsBoolean(
    FeatureNameEnum.AGENT_EMAIL_INTEGRATION,
    subscription?.apiServiceLevel ?? ApiServiceLevelEnum.FREE
  );
}
