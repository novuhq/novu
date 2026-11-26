import { useMemo } from 'react';
import { CopilotCanvasToastBar } from './copilot-canvas-toast-bar';
import { collectChangeRows, getCardTurnSteps } from './copilot-steps';
import { useCopilotWebChat } from './copilot-web-chat-context';
import { getOpenReviewActions } from './copilot-web-chat-utils';

/** The canvas toast of the web-chat sidebar: Cancel while the Copilot works, Keep all / Discard on its review card. */
export function CopilotWebChatCanvasToast() {
  const { chat, isBusy, stop, sendCardAction, pendingReviewMessageId } = useCopilotWebChat();
  const messages = chat?.messages;
  const review = useMemo(() => {
    const thread = messages ?? [];
    const { keep, revert } = getOpenReviewActions(thread);
    const sourceMessageId = keep?.sourceMessageId ?? revert?.sourceMessageId;
    const changeCount = sourceMessageId ? collectChangeRows(getCardTurnSteps(thread, sourceMessageId)).length : 0;

    return { keep, revert, changeCount };
  }, [messages]);
  // A review click is answered with a note, not an edit: the bar keeps the review, its buttons locked, until it lands.
  const isEditing = isBusy && !pendingReviewMessageId;
  const isReviewing = !isEditing && !!(review.keep || review.revert);
  const { keep, revert } = review;

  return (
    <CopilotCanvasToastBar
      isVisible={isEditing || isReviewing}
      variant={isEditing ? 'running' : 'reviewing'}
      changeCount={review.changeCount}
      // Stopping lasts until the agent's current step ends, so a second Cancel has nothing to add.
      isCancelDisabled={!!chat?.isStopping}
      isActionPending={isBusy}
      onCancel={stop}
      onKeepAll={keep ? () => void sendCardAction(keep) : undefined}
      onDiscard={revert ? () => void sendCardAction(revert) : undefined}
    />
  );
}
