import { useMemo } from 'react';
import { CopilotCanvasToastBar } from './copilot-canvas-toast-bar';
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
  const isActionPending = !!pendingReviewMessageId;

  return (
    <CopilotCanvasToastBar
      isVisible={isBusy || isReviewing}
      variant={isBusy ? 'running' : 'reviewing'}
      // Stopping lasts until the agent's current step ends, so a second Cancel has nothing to add.
      isCancelDisabled={!!chat?.isStopping || isActionPending}
      isActionPending={isActionPending}
      onCancel={stop}
      onKeepAll={keep ? () => void sendCardAction(keep) : undefined}
      onDiscard={revert ? () => void sendCardAction(revert) : undefined}
    />
  );
}
