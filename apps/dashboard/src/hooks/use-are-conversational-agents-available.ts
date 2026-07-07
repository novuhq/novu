import { FeatureFlagsKeysEnum } from '@novu/shared';
import { IS_EU, IS_SELF_HOSTED_CE } from '@/config';
import { useFeatureFlag } from '@/hooks/use-feature-flag';

export function areConversationalAgentsAvailable(isAgentsEnabled: boolean): boolean {
  return isAgentsEnabled && !IS_EU && !IS_SELF_HOSTED_CE;
}

export function useAreConversationalAgentsAvailable(): boolean {
  const isAgentsEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CONVERSATIONAL_AGENTS_ENABLED, false);

  return areConversationalAgentsAvailable(isAgentsEnabled);
}
