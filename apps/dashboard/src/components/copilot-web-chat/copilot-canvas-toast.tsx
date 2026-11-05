import { useMemo } from 'react';
import { SidekickToast } from '@/components/ai-sidekick/sidekick-toast';
import { useCopilotWebChat } from './copilot-web-chat-context';
import { getOpenReviewActions } from './copilot-web-chat-utils';

/** The canvas toast of the web-chat sidebar: Cancel while the Copilot works, Keep all / Discard on its review card. */
export function CopilotWebChatCanvasToast() {
  const { chat, isBusy, stop, sendCardAction, pendingReviewMessageId } = useCopilotWebChat();
  const messages = chat?.messages;
  const { keep, revert } = useMemo(
    () => getOpenReviewActions(messages ?? [], pendingReviewMessageId),
    [messages, pendingReviewMessageId]
  );
  const isReviewing = !isBusy && !!(keep || revert);

  return (
    <SidekickToast
      isVisible={isBusy || isReviewing}
      variant={isBusy ? 'generating' : 'reviewing'}
      isActionPending={!!pendingReviewMessageId}
      onCancel={stop}
      onKeepAll={keep ? () => void sendCardAction(keep) : undefined}
      onDiscard={revert ? () => void sendCardAction(revert) : undefined}
    />
  );
}
