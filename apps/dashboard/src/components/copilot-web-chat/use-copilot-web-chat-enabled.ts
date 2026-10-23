import { FeatureFlagsKeysEnum } from '@novu/shared';
import { IS_AI_FEATURES_ENABLED } from '@/config';
import { useFeatureFlag } from '@/hooks/use-feature-flag';

/** Feature-flag gate for the web-chat Copilot popover (the legacy sidebar is used when false). */
export function useCopilotWebChatEnabled(): boolean {
  const isFlagEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_COPILOT_WEB_CHAT_ENABLED, false);

  return isFlagEnabled && IS_AI_FEATURES_ENABLED;
}
