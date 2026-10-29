import { useRegisterCopilotContext } from './copilot-web-chat-context';
import type { CopilotPageContext } from './copilot-web-chat-utils';
import { useCopilotWebChatEnabled } from './use-copilot-web-chat-enabled';

type Params = CopilotPageContext & {
  /** Whether the Copilot may act on this workflow (dev environment, non-external). */
  isAvailable: boolean;
  /** Whether the legacy AI workflow generation sidebar would be enabled for this page. */
  isLegacyCopilotEnabled: boolean;
  onRefetch: () => void;
};

/**
 * Called by workflow editor pages. Registers the page context with the web-chat Copilot when
 * its flag is on, and returns whether the page should still render the legacy sidebar.
 */
export function useWorkflowEditorCopilot({ isAvailable, isLegacyCopilotEnabled, ...context }: Params): boolean {
  const isWebChatEnabled = useCopilotWebChatEnabled();

  useRegisterCopilotContext({ ...context, enabled: isWebChatEnabled && isAvailable });

  return isLegacyCopilotEnabled && isAvailable && !isWebChatEnabled;
}
