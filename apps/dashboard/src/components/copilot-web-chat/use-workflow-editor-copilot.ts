import { type EditorCopilotMode, isWebChatMode } from './copilot-mode';
import { useEditorCopilotMode } from './copilot-mode-context';
import { useRegisterCopilotContext } from './copilot-web-chat-context';
import type { CopilotPageContext } from './copilot-web-chat-utils';

type Params = CopilotPageContext & {
  /** Whether the Copilot may act on this workflow (dev environment, non-external). */
  isAvailable: boolean;
  onRefetch: () => void;
};

/**
 * Called by workflow editor pages. Returns the Copilot mode this page renders (a `pending-*` prediction while the
 * visit's mode resolves), or `null` when it has no Copilot (unavailable or AI workflow generation off), and registers
 * the page with web chat.
 */
export function useWorkflowEditorCopilot({ isAvailable, ...context }: Params): EditorCopilotMode | null {
  const editorMode = useEditorCopilotMode();
  const copilotMode = isAvailable ? editorMode : null;

  useRegisterCopilotContext({ ...context, enabled: isWebChatMode(copilotMode) });

  return copilotMode;
}
