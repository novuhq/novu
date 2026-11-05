import { isWebChatMode } from './copilot-mode';
import { useEditorCopilotMode } from './copilot-mode-context';
import { useRegisterCopilotContext } from './copilot-web-chat-context';
import type { CopilotPageContext } from './copilot-web-chat-utils';
import type { CopilotMode } from './use-copilot-web-chat-enabled';

type Params = CopilotPageContext & {
  /** Whether the Copilot may act on this workflow (dev environment, non-external). */
  isAvailable: boolean;
  onRefetch: () => void;
};

/**
 * Called by workflow editor pages. Returns the Copilot mode this page renders, or `null` when it has no Copilot
 * (unavailable, AI workflow generation off, or the mode is not resolved yet), and registers the page with web chat.
 */
export function useWorkflowEditorCopilot({ isAvailable, ...context }: Params): CopilotMode | null {
  const editorMode = useEditorCopilotMode();
  const copilotMode = isAvailable ? editorMode : null;

  useRegisterCopilotContext({ ...context, enabled: isWebChatMode(copilotMode) });

  return copilotMode;
}
