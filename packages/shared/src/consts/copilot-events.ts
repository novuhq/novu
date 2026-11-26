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
 * Custom agent event the Copilot emits on web chat once it finished an answer: how long it worked before answering,
 * the plan it shared on the way, and what the user may want to do next. Its data is a `CopilotAnswerDetails`.
 */
export const COPILOT_ANSWER_DETAILS_EVENT = 'copilot.answer-details';

/** A next step offered under an answer: `text` is sent to the Copilot, unless `url` names the dashboard page it opens. */
export type CopilotFollowUp = {
  text: string;
  url?: string;
};

export type CopilotAnswerDetails = {
  /** From the user's message until the Copilot started writing its answer. */
  thoughtMs: number;
  /** The plans the Copilot shared while it worked, in markdown, oldest first. */
  thoughts: string[];
  /** At most `COPILOT_FOLLOW_UPS_LIMIT`, the likeliest first. */
  followUps: CopilotFollowUp[];
};

export const COPILOT_FOLLOW_UPS_LIMIT = 3;

/**
 * Custom agent event the Copilot emits on web chat for each result it shows as a card below its answer: a chart, a
 * list of items to open or pick, or a checklist with fixes. Its data is a `CopilotResultCard`.
 */
export const COPILOT_RESULT_CARD_EVENT = 'copilot.result-card';

/** A card button: sends `ask` to the Copilot as the user's next message, or opens `url`, a dashboard page. */
export type CopilotResultAction = { label: string } & ({ ask: string } | { url: string });

export type CopilotResultTone = 'success' | 'warning' | 'error' | 'neutral';

export type CopilotResultChartCard = {
  type: 'chart';
  title: string;
  chart: 'bar' | 'line';
  /** The x-axis labels. */
  categories: string[];
  /** Each series has one value per category. */
  series: Array<{ name: string; values: number[] }>;
};

export type CopilotResultListItem = {
  title: string;
  description?: string;
  status?: { label: string; tone: CopilotResultTone };
  /** Sent to the Copilot as the user's next message when the row is picked. */
  ask?: string;
  /** The dashboard page the row opens. */
  url?: string;
};

export type CopilotResultListCard = {
  type: 'list';
  title: string;
  items: CopilotResultListItem[];
};

export type CopilotChecklistItem = {
  status: 'pass' | 'warning' | 'fail';
  label: string;
  description?: string;
  fix?: CopilotResultAction;
};

export type CopilotResultChecklistCard = {
  type: 'checklist';
  title: string;
  items: CopilotChecklistItem[];
};

export type CopilotResultCard = CopilotResultChartCard | CopilotResultListCard | CopilotResultChecklistCard;

/** What a result card holds at most, so a card stays readable in the chat and its event stays small. */
export const COPILOT_RESULT_CARD_LIMITS = {
  listItems: 20,
  checklistItems: 12,
  chartCategories: 24,
  chartSeries: 4,
} as const;
