import { RiHistoryLine } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { cn } from '@/utils/ui';
import { useCopilotWebChat } from './copilot-web-chat-context';

export function CopilotHistoryButton() {
  const { isAvailable, isHistoryOpen, openHistory, closeHistory } = useCopilotWebChat();

  return (
    <Button
      variant="secondary"
      size="2xs"
      mode="ghost"
      className={cn('p-1.5 text-icon-soft', isHistoryOpen && 'bg-bg-weak text-text-strong')}
      leadingIcon={RiHistoryLine}
      disabled={!isAvailable}
      onClick={isHistoryOpen ? closeHistory : openHistory}
      aria-label="Chat history"
      aria-pressed={isHistoryOpen}
      title="Chat history"
    />
  );
}
