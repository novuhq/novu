import { EnvironmentTypeEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { IS_AI_FEATURES_ENABLED } from '@/config';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';

/** Rollout steps of the workflow editor Copilot: the legacy `/ai` sidebar, web chat in that sidebar, then the popover. */
export type CopilotMode = 'legacy' | 'web-chat-sidebar' | 'web-chat-popover';

/** Feature-flag gate for the web-chat Copilot, in the sidebar or the popover (the legacy sidebar is used when false). */
export function useCopilotWebChatEnabled(): boolean {
  const isFlagEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_COPILOT_WEB_CHAT_ENABLED, false);

  return isFlagEnabled && IS_AI_FEATURES_ENABLED;
}

/** The Copilot mode the flags ask for right now; LaunchDarkly can change it mid-visit. */
export function useCopilotMode(): CopilotMode {
  const isWebChatEnabled = useCopilotWebChatEnabled();
  const isPopoverEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_COPILOT_WEB_CHAT_POPOVER_ENABLED, false);

  if (!isWebChatEnabled) {
    return 'legacy';
  }

  return isPopoverEnabled ? 'web-chat-popover' : 'web-chat-sidebar';
}

/**
 * Whether the create-workflow modal hands guided generation to web chat (sidebar or popover). It reads the live flags;
 * the editor fixes its mode per visit, which agrees on a just-created workflow since it has no legacy chat to review.
 */
export function useCopilotWebChatActive(): boolean {
  const { currentEnvironment } = useEnvironment();

  return useCopilotWebChatEnabled() && currentEnvironment?.type === EnvironmentTypeEnum.DEV;
}
