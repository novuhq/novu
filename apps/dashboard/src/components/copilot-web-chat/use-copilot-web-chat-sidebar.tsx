import { type ReactNode, useContext, useEffect } from 'react';
import type { EditorCopilotMode } from './copilot-mode';
import { CopilotNewChatButton } from './copilot-new-chat-button';
import { type CopilotSuggestion, CopilotThreadPanel } from './copilot-thread-panel';
import { CopilotSidebarControlContext } from './copilot-web-chat-context';

type CopilotWebChatSidebar = {
  copilotContent: ReactNode;
  headerActions: ReactNode;
  isGenerating: boolean;
  isRevealPending: boolean;
};

/**
 * `CopilotSidebar` props that show the web-chat conversation, for a page that renders them in `web-chat-sidebar` mode;
 * while it does, ⌘J and ⌘K "Ask Copilot" reveal its sidebar.
 */
export function useCopilotWebChatSidebar({
  copilotMode,
  suggestions,
}: {
  copilotMode: EditorCopilotMode | null;
  suggestions: CopilotSuggestion[];
}): CopilotWebChatSidebar {
  const { isGenerating, isRevealPending, registerSidebar } = useContext(CopilotSidebarControlContext);
  const isRendered = copilotMode === 'web-chat-sidebar';

  useEffect(() => (isRendered ? registerSidebar() : undefined), [isRendered, registerSidebar]);

  return {
    copilotContent: (
      <div className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-bg-white">
        <CopilotThreadPanel suggestions={suggestions} />
      </div>
    ),
    headerActions: <CopilotNewChatButton />,
    isGenerating,
    isRevealPending,
  };
}
