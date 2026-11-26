import type { StepTypeEnum } from '../types';

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

/**
 * Custom agent event the Copilot emits on web chat after each tool call of a turn, so the dashboard lists what the
 * turn did as a checklist and the steps it changed as change rows. History keeps it, so restored threads list it too.
 */
export const COPILOT_STEP_EVENT = 'copilot.step';

/** Button ids of the Keep / Revert / Try again card the Copilot posts after a web-chat turn changed the workflow. */
export enum CopilotReviewActionEnum {
  KEEP = 'copilot.keep',
  REVERT = 'copilot.revert',
  TRY_AGAIN = 'copilot.try-again',
}

/** What a Copilot tool call did to a workflow step. */
export enum CopilotWorkflowChangeEnum {
  ADDED = 'added',
  EDITED = 'edited',
  REMOVED = 'removed',
  MOVED = 'moved',
}

/** The workflow step a Copilot tool call changed. */
export type CopilotWorkflowStepChange = {
  kind: CopilotWorkflowChangeEnum;
  stepId: string;
  stepName: string;
  stepType: StepTypeEnum;
};

/** The data of {@link COPILOT_STEP_EVENT}. */
export type CopilotStepEventData = {
  /** The tool call. A call the agent retried sends it again, and the later event replaces the earlier row. */
  id: string;
  /** What the call did, as the checklist reads once it is done ("Added Email Step", "Checked Activity"). */
  label: string;
  /** Shown when the checklist row is expanded: the plan the `reasoning` tool shared. */
  detail?: string;
  /** The step the call changed. Reads and calls that change the workflow itself (metadata, payload schema) have none. */
  change?: CopilotWorkflowStepChange;
  isError?: boolean;
  /** Time from the start of the turn to the end of this call, so "Thought for Xs" reads the same live and restored. */
  elapsedMs: number;
};
