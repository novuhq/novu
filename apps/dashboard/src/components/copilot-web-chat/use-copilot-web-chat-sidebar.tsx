import { type ReactNode, useContext, useEffect } from 'react';
import { CopilotNewChatButton } from './copilot-new-chat-button';
import { type CopilotSuggestion, CopilotThreadPanel } from './copilot-thread-panel';
import { CopilotSidebarControlContext } from './copilot-web-chat-context';

type CopilotWebChatSidebar = {
  copilotContent: ReactNode;
  headerActions: ReactNode;
  isGenerating: boolean;
  isRevealPending: boolean;
};

/** `CopilotSidebar` props that show the web-chat conversation; while `isRendered`, ⌘J and ⌘K "Ask Copilot" reveal it. */
export function useCopilotWebChatSidebar({
  isRendered,
  suggestions,
}: {
  isRendered: boolean;
  suggestions: CopilotSuggestion[];
}): CopilotWebChatSidebar {
  const { isGenerating, isRevealPending, registerSidebar } = useContext(CopilotSidebarControlContext);

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
