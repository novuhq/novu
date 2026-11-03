import { EnvironmentTypeEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { IS_AI_FEATURES_ENABLED } from '@/config';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';

/** Feature-flag gate for the web-chat Copilot popover (the legacy sidebar is used when false). */
export function useCopilotWebChatEnabled(): boolean {
  const isFlagEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_COPILOT_WEB_CHAT_ENABLED, false);

  return isFlagEnabled && IS_AI_FEATURES_ENABLED;
}

/**
 * Whether the workflow editor mounts the Copilot popover. The create-workflow modal hands guided generation to the
 * popover on the same gate, so the two must not drift apart.
 */
export function useCopilotWebChatActive(): boolean {
  const { currentEnvironment } = useEnvironment();

  return useCopilotWebChatEnabled() && currentEnvironment?.type === EnvironmentTypeEnum.DEV;
}
