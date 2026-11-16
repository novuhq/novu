import { EnvironmentTypeEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { createContext, useContext } from 'react';
import { IS_AI_FEATURES_ENABLED } from '@/config';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { type CopilotMode, type EditorCopilotMode, isWebChatMode } from './copilot-mode';
import { useRegisterCopilotContext } from './copilot-web-chat-context';
import type { CopilotPageContext } from './copilot-web-chat-utils';

/** `null` is no Copilot, which is also what a page outside `CopilotModeProvider` (the local editor) gets. */
export const CopilotModeContext = createContext<EditorCopilotMode | null>(null);

/** The Copilot mode the flags ask for right now; LaunchDarkly can change it mid-visit. */
export function useLiveCopilotMode(): CopilotMode {
  const isWebChatEnabled =
    useFeatureFlag(FeatureFlagsKeysEnum.IS_COPILOT_WEB_CHAT_ENABLED, false) && IS_AI_FEATURES_ENABLED;
  const isPopoverEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_COPILOT_WEB_CHAT_POPOVER_ENABLED, false);

  if (!isWebChatEnabled) {
    return 'legacy';
  }

  return isPopoverEnabled ? 'web-chat-popover' : 'web-chat-sidebar';
}

/**
 * Called by the canvas and the step editor: what this visit shows for the Copilot (a `pending-*` prediction while its
 * mode resolves, `null` for none). Registers the page with web chat when web chat is the Copilot.
 */
export function useWorkflowEditorCopilot(
  context: CopilotPageContext & { onRefetch: () => void }
): EditorCopilotMode | null {
  const mode = useContext(CopilotModeContext);

  useRegisterCopilotContext({ ...context, enabled: isWebChatMode(mode) });

  return mode;
}

/**
 * Whether the create-workflow modal hands guided generation to web chat. It reads the live flags while the editor
 * fixes its mode per visit, and the two agree on the workflow it creates: the create route is only reachable with AI
 * workflow generation on (pages/create-workflow.tsx), and a new workflow has no legacy chat to review.
 */
export function useCopilotWebChatActive(): boolean {
  const { currentEnvironment } = useEnvironment();
  const liveMode = useLiveCopilotMode();

  return isWebChatMode(liveMode) && currentEnvironment?.type === EnvironmentTypeEnum.DEV;
}
