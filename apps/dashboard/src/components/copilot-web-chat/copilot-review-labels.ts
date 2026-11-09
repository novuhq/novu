import { CopilotReviewActionEnum } from '@novu/shared';
import { isCopilotReviewActionId } from './copilot-web-chat-utils';

/** The dashboard's copy for the review buttons, shared by the card and the canvas toast. Stored cards keep the agent's labels. */
export const COPILOT_REVIEW_LABELS: Record<CopilotReviewActionEnum, string> = {
  [CopilotReviewActionEnum.KEEP]: 'Keep all',
  [CopilotReviewActionEnum.REVERT]: 'Discard',
  [CopilotReviewActionEnum.TRY_AGAIN]: 'Try again',
};

/** The label a card button shows: the dashboard's copy for a review button, the agent's label for any other. */
export function getCardButtonLabel(button: { id: string; label: string }): string {
  if (!isCopilotReviewActionId(button.id)) return button.label;

  return COPILOT_REVIEW_LABELS[button.id as CopilotReviewActionEnum];
}
