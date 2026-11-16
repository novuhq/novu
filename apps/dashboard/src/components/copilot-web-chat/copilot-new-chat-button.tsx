import { RiAddLine } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { useCopilotWebChat } from './copilot-web-chat-context';

export function CopilotNewChatButton() {
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
