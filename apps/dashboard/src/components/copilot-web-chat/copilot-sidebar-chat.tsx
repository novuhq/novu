import { useContext } from 'react';
import { RiAddLine } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { type CopilotSuggestion, CopilotThreadPanel } from './copilot-thread-panel';
import { CopilotSidebarControlContext, useCopilotWebChat } from './copilot-web-chat-context';

/** `CopilotSidebar` props that let `open()` expand it, keep `isOpen` in sync with it and animate its icon. */
type CopilotSidebarControl = {
  expandRequest: number;
  onVisibleChange: (visible: boolean) => void;
  isGenerating: boolean;
};

/** The web-chat conversation for `CopilotSidebar`'s `copilotContent`. */
export function CopilotSidebarChat({ suggestions }: { suggestions?: CopilotSuggestion[] }) {
  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-bg-white">
      <CopilotThreadPanel suggestions={suggestions} />
    </div>
  );
}

/** New chat, for `CopilotSidebar`'s `headerActions`. */
export function CopilotSidebarHeaderActions() {
  const { isAvailable, chat, startNewConversation } = useCopilotWebChat();

  return (
    <Button
      variant="secondary"
      size="2xs"
      mode="ghost"
      className="p-1.5 text-icon-soft"
      leadingIcon={RiAddLine}
      disabled={!isAvailable || !!chat?.isRunning}
      onClick={startNewConversation}
      aria-label="New chat"
      title="New chat"
    />
  );
}

export function useCopilotSidebarControl(): CopilotSidebarControl {
  const { focusRequest, setSurfaceVisible, isBusy } = useContext(CopilotSidebarControlContext);

  return { expandRequest: focusRequest, onVisibleChange: setSurfaceVisible, isGenerating: isBusy };
}
