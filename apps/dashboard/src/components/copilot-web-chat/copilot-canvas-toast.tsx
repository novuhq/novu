import { CopilotReviewActionEnum } from '@novu/shared';
import { SidekickToast } from '@/components/ai-sidekick/sidekick-toast';
import { useCopilotWebChat } from './copilot-web-chat-context';
import { getOpenReviewAction, getOpenReviewCard } from './copilot-web-chat-utils';

/** The canvas toast of the web-chat sidebar: Cancel while the Copilot works, Keep all / Discard on its review card. */
export function CopilotWebChatCanvasToast() {
  const { chat, isBusy, stop, sendCardAction, pendingReviewMessageId } = useCopilotWebChat();
  const messages = chat?.messages ?? [];
  const isReviewing = !isBusy && !!getOpenReviewCard(messages, pendingReviewMessageId);
  const keepAction = getOpenReviewAction(messages, CopilotReviewActionEnum.KEEP, pendingReviewMessageId);
  const revertAction = getOpenReviewAction(messages, CopilotReviewActionEnum.REVERT, pendingReviewMessageId);

  return (
    <SidekickToast
      isVisible={isBusy || isReviewing}
      variant={isBusy ? 'generating' : 'reviewing'}
      isActionPending={!!pendingReviewMessageId}
      onCancel={stop}
      onKeepAll={keepAction ? () => void sendCardAction(keepAction) : undefined}
      onDiscard={revertAction ? () => void sendCardAction(revertAction) : undefined}
    />
  );
}
