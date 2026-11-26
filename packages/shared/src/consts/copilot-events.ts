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

/**
 * Tools the Copilot calls on web chat to put buttons under its reply rather than to act: the turn posts what they
 * recorded as a card, so the dashboard draws that card and not the calls.
 */
export enum CopilotAnswerToolEnum {
  SHOW_NEXT_STEPS = 'show_next_steps',
  REPORT_WORKFLOW_ISSUES = 'report_workflow_issues',
}

/**
 * Card buttons the Copilot posts on web chat that never reach its `onAction`: the dashboard sends the button's `value`
 * as the user's next message. An ask is a next step of an answer, a fix the fix of one issue a workflow review found.
 */
export const COPILOT_ASK_ACTION_ID = 'copilot.ask';
const COPILOT_FIX_ACTION_ID = 'copilot.fix';

/** The id of an issue's Fix button: `copilot.fix`, or `copilot.fix:<stepId>` for an issue on a step. */
export function buildCopilotFixActionId(stepId?: string): string {
  return stepId ? `${COPILOT_FIX_ACTION_ID}:${stepId}` : COPILOT_FIX_ACTION_ID;
}

/** The step a Fix button's issue is on (`stepId` undefined for the workflow itself), or undefined for any other id. */
export function parseCopilotFixActionId(actionId: string): { stepId?: string } | undefined {
  if (actionId === COPILOT_FIX_ACTION_ID) return {};
  if (!actionId.startsWith(`${COPILOT_FIX_ACTION_ID}:`)) return undefined;

  const stepId = actionId.slice(COPILOT_FIX_ACTION_ID.length + 1);

  return stepId ? { stepId } : {};
}

/** Whether a card button is an ask or a fix, whose `value` the dashboard sends as the user's message. */
export function isCopilotPromptActionId(actionId: string): boolean {
  return actionId === COPILOT_ASK_ACTION_ID || parseCopilotFixActionId(actionId) !== undefined;
}
