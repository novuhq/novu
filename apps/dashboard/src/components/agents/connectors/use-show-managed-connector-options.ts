import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useFeatureFlag } from '@/hooks/use-feature-flag';

export function useShowManagedConnectorOptions(override?: boolean): boolean {
  const fromFlag = useFeatureFlag(FeatureFlagsKeysEnum.IS_MANAGED_AGENT_RUNTIME_ENABLED, false);

  return override ?? fromFlag;
}
