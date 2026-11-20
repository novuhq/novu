import type { StepTypeEnum } from '../types';

/**
 * Custom agent event the Copilot emits on web chat after a tool call changed the workflow, so the dashboard
 * refreshes the canvas while the run is still going and lists the step the call changed.
 */
export const COPILOT_WORKFLOW_UPDATED_EVENT = 'copilot.workflow-updated';

/** What a Copilot tool call did to a step. */
export enum CopilotWorkflowChangeEnum {
  ADDED = 'added',
  EDITED = 'edited',
  REMOVED = 'removed',
  MOVED = 'moved',
}

/** The step a tool call changed, shown as a change row in the web chat. */
export type CopilotWorkflowStepChange = {
  kind: CopilotWorkflowChangeEnum;
  stepId: string;
  stepName: string;
  stepType: StepTypeEnum;
};

/** The data of {@link COPILOT_WORKFLOW_UPDATED_EVENT}. Calls that change the workflow itself, not a step, have no `change`. */
export type CopilotWorkflowUpdatedEventData = {
  workflowId: string;
  change?: CopilotWorkflowStepChange;
};

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
