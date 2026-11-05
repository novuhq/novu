/**
 * Custom agent event the Copilot emits on web chat after a tool call changed the workflow, so the dashboard
 * refreshes the canvas while the run is still going.
 */
export const COPILOT_WORKFLOW_UPDATED_EVENT = 'copilot.workflow-updated';

/**
 * Custom agent event the Copilot emits on web chat once a Try again click reverted the turn, so the dashboard
 * resends that turn's prompt. Its data names the card (`sourceMessageId`) and the user message the turn answered
 * (`promptMessageId`).
 */
export const COPILOT_TRY_AGAIN_READY_EVENT = 'copilot.try-again-ready';

/** Button ids of the Keep / Revert / Try again card the Copilot posts after a web-chat turn changed the workflow. */
export enum CopilotReviewActionEnum {
  KEEP = 'copilot.keep',
  REVERT = 'copilot.revert',
  TRY_AGAIN = 'copilot.try-again',
}
