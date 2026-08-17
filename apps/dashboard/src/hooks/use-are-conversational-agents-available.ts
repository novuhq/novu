import { FeatureFlagsKeysEnum } from '@novu/shared';
import { IS_EU, IS_SELF_HOSTED_CE } from '@/config';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { agentRedirectDebugLog } from '@/utils/agent-redirect-debug';

export function useAreConversationalAgentsAvailable(): boolean {
  const isAgentsEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CONVERSATIONAL_AGENTS_ENABLED, false);
  const result = isAgentsEnabled && !IS_EU && !IS_SELF_HOSTED_CE;

  // #region agent log
  agentRedirectDebugLog({
    hypothesisId: 'A',
    location: 'use-are-conversational-agents-available.ts',
    message: 'useAreConversationalAgentsAvailable',
    data: { isAgentsEnabled, IS_EU, IS_SELF_HOSTED_CE, result },
  });
  // #endregion

  return result;
}
