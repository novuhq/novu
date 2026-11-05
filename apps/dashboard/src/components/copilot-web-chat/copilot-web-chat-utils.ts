import type { AgentCardChild, AgentCardElement, AgentCardPart, AgentMessage, AgentToolPart } from '@novu/js';
import { AiWorkflowToolsEnum, CopilotReviewActionEnum } from '@novu/shared';

/** The tools the Copilot agent emits (the same camelCase names on the direct and the MCP-backed suites). */
const WORKFLOW_WRITE_TOOL_NAMES: ReadonlySet<string> = new Set([
  AiWorkflowToolsEnum.SET_WORKFLOW_METADATA,
  AiWorkflowToolsEnum.ADD_STEP,
  AiWorkflowToolsEnum.ADD_STEP_IN_BETWEEN,
  AiWorkflowToolsEnum.EDIT_STEP_CONTENT,
  AiWorkflowToolsEnum.UPDATE_STEP_CONDITIONS,
  AiWorkflowToolsEnum.REMOVE_STEP,
  AiWorkflowToolsEnum.MOVE_STEP,
  AiWorkflowToolsEnum.UPDATE_PAYLOAD_SCHEMA,
]);

/** Tool names may arrive namespaced by the MCP server (`server__tool`), so match on the last segment. */
function normalizeToolName(toolName: string): string {
  const parts = toolName.split(/__|\./);

  return parts[parts.length - 1] ?? toolName;
}

export function isWorkflowWriteTool(toolName: string): boolean {
  return WORKFLOW_WRITE_TOOL_NAMES.has(normalizeToolName(toolName));
}

const REVIEW_ACTION_IDS: ReadonlySet<string> = new Set(Object.values(CopilotReviewActionEnum));

/** Whether a card button is one of the Keep / Revert / Try again buttons the agent posts after it changed the workflow. */
export function isCopilotReviewActionId(actionId: string): boolean {
  return REVIEW_ACTION_IDS.has(actionId);
}

/** A card button click, sent back to the agent's `onAction`. */
export type CopilotCardAction = { actionId: string; sourceMessageId: string; value?: string };

export type CopilotPageContext = {
  workflowId?: string;
  stepId?: string;
  /** Human readable ids shown in chips. Not sent to the agent. */
  workflowLabel?: string;
  stepLabel?: string;
};

export function buildCopilotMetadata(
  context: CopilotPageContext | undefined,
  environmentId: string | undefined
): Record<string, string> {
  const metadata: Record<string, string> = {};

  // The hosted tenant context is shared across environments, so the agent reads the viewed one from here.
  if (environmentId) metadata.environmentId = environmentId;
  if (context?.workflowId) metadata.workflowId = context.workflowId;
  if (context?.stepId) metadata.stepId = context.stepId;

  return metadata;
}

const CONVERSATION_STORAGE_PREFIX = 'novu-copilot-conversation:';

/** Last Copilot conversation for a scope (account + environment + workflow), so a reload resumes it. */
export function readStoredConversationId(scope: string | undefined): string | undefined {
  if (!scope) return undefined;

  try {
    return window.localStorage.getItem(`${CONVERSATION_STORAGE_PREFIX}${scope}`) ?? undefined;
  } catch {
    return undefined;
  }
}

export function writeStoredConversationId(scope: string | undefined, conversationId: string | undefined): void {
  if (!scope) return;

  try {
    const key = `${CONVERSATION_STORAGE_PREFIX}${scope}`;
    if (conversationId) window.localStorage.setItem(key, conversationId);
    else window.localStorage.removeItem(key);
  } catch {
    // Storage can be unavailable (private mode, blocked site data); resuming is best-effort.
  }
}

export type LauncherState = 'idle' | 'working' | 'ready' | 'error' | 'off';

export function deriveLauncherState(input: {
  isAvailable: boolean;
  isRunning: boolean;
  hasError: boolean;
  hasUnseenAnswer: boolean;
}): LauncherState {
  if (!input.isAvailable) return 'off';
  if (input.isRunning) return 'working';
  if (input.hasError) return 'error';
  if (input.hasUnseenAnswer) return 'ready';

  return 'idle';
}

/** `stopped`: the user stopped the run before this tool reported a result. */
export type ToolRowStatus = 'pending' | 'active' | 'done' | 'error' | 'stopped';
export type ToolChange = 'Added' | 'Edited' | 'Removed' | 'Moved';

export type ToolRow = {
  id: string;
  label: string;
  arg?: string;
  status: ToolRowStatus;
  change?: ToolChange;
  isWrite: boolean;
  /** The existing or new step a write tool targets; absent for workflow-level writes. */
  stepId?: string;
};

const TOOL_LABELS: Record<string, { label: string; change?: ToolChange }> = {
  [AiWorkflowToolsEnum.SET_WORKFLOW_METADATA]: { label: 'Editing workflow details', change: 'Edited' },
  [AiWorkflowToolsEnum.ADD_STEP]: { label: 'Adding step', change: 'Added' },
  [AiWorkflowToolsEnum.ADD_STEP_IN_BETWEEN]: { label: 'Adding step', change: 'Added' },
  [AiWorkflowToolsEnum.EDIT_STEP_CONTENT]: { label: 'Editing step content', change: 'Edited' },
  [AiWorkflowToolsEnum.UPDATE_STEP_CONDITIONS]: { label: 'Editing step conditions', change: 'Edited' },
  [AiWorkflowToolsEnum.REMOVE_STEP]: { label: 'Removing step', change: 'Removed' },
  [AiWorkflowToolsEnum.MOVE_STEP]: { label: 'Moving step', change: 'Moved' },
  [AiWorkflowToolsEnum.UPDATE_PAYLOAD_SCHEMA]: { label: 'Editing payload schema', change: 'Edited' },
};

function humanizeToolName(toolName: string): string {
  const words = normalizeToolName(toolName).replace(/_/g, ' ').trim();

  return words.charAt(0).toUpperCase() + words.slice(1);
}

const ARG_KEYS = ['stepId', 'name', 'stepName', 'workflowId', 'type', 'afterStepId'] as const;

function pickKeyArg(input: Record<string, unknown> | undefined): string | undefined {
  if (!input) return undefined;

  for (const key of ARG_KEYS) {
    const value = input[key];
    if (typeof value === 'string' && value) return value;
  }

  return undefined;
}

/** Step tools send `stepId` at the top level, except add/edit content which nest it under `step`. */
function pickTargetStepId(input: Record<string, unknown> | undefined): string | undefined {
  const nested = input?.step;
  const nestedStepId =
    typeof nested === 'object' && nested !== null ? (nested as { stepId?: unknown }).stepId : undefined;
  const stepId = input?.stepId ?? nestedStepId;

  return typeof stepId === 'string' && stepId ? stepId : undefined;
}

export function toolPartToRow(
  part: Pick<AgentToolPart, 'toolUseId' | 'toolName' | 'input' | 'state'>,
  isStopped = false
): ToolRow {
  const known = TOOL_LABELS[normalizeToolName(part.toolName)];
  let status: ToolRowStatus = isStopped ? 'stopped' : 'active';

  if (part.state === 'output-available') status = 'done';
  else if (part.state === 'output-error') status = 'error';

  return {
    id: part.toolUseId,
    label: known?.label ?? humanizeToolName(part.toolName),
    arg: pickKeyArg(part.input),
    status,
    change: known?.change,
    isWrite: isWorkflowWriteTool(part.toolName),
    stepId: pickTargetStepId(part.input),
  };
}

export type ToolGroupSummary = { isRunning: boolean; title: string };

export function summarizeToolGroup(rows: readonly ToolRow[]): ToolGroupSummary {
  const isRunning = rows.some((row) => row.status === 'active' || row.status === 'pending');
  const doneWrites = rows.filter((row) => row.isWrite && row.status === 'done');
  const stepCount = new Set(doneWrites.flatMap((row) => (row.stepId ? [row.stepId] : []))).size;

  if (isRunning) return { isRunning, title: 'Editing workflow' };
  if (stepCount > 0) return { isRunning, title: `Edited ${stepCount} ${stepCount === 1 ? 'step' : 'steps'}` };
  if (doneWrites.length > 0) return { isRunning, title: 'Edited workflow' };

  return { isRunning, title: `Used ${rows.length} ${rows.length === 1 ? 'tool' : 'tools'}` };
}

export type AssistantBlock =
  | { kind: 'text'; key: string; text: string; streaming: boolean }
  | { kind: 'thinking'; key: string; text: string; streaming: boolean }
  | { kind: 'tools'; key: string; rows: ToolRow[] }
  | { kind: 'card'; key: string; card: AgentCardElement; sourceMessageId: string };

/** Groups consecutive tool parts into one block and drops parts this UI does not render. */
export function buildAssistantBlocks(message: AgentMessage): AssistantBlock[] {
  const blocks: AssistantBlock[] = [];

  message.parts.forEach((part, index) => {
    const key = `${message.id}:${index}`;

    if (part.type === 'text') {
      if (!part.text.trim()) return;
      blocks.push({ kind: 'text', key, text: part.text, streaming: part.state === 'streaming' });
    } else if (part.type === 'thinking') {
      blocks.push({ kind: 'thinking', key, text: part.text, streaming: part.state === 'streaming' });
    } else if (part.type === 'tool') {
      const row = toolPartToRow(part, message.stopped);
      const last = blocks[blocks.length - 1];

      if (last?.kind === 'tools') last.rows.push(row);
      else blocks.push({ kind: 'tools', key, rows: [row] });
    } else if (part.type === 'card') {
      blocks.push({ kind: 'card', key, card: part.card, sourceMessageId: part.sourceMessageId });
    }
  });

  return blocks;
}

function getLastCardPart(messages: readonly AgentMessage[]): AgentCardPart | undefined {
  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex--) {
    const parts = messages[messageIndex].parts;

    for (let partIndex = parts.length - 1; partIndex >= 0; partIndex--) {
      const part = parts[partIndex];
      if (part.type === 'card') return part;
    }
  }

  return undefined;
}

/** The `sourceMessageId` of the newest card in the thread; review buttons are only offered on that card. */
export function getLastCardSourceMessageId(messages: readonly AgentMessage[]): string | undefined {
  return getLastCardPart(messages)?.sourceMessageId;
}

type CardActionChild = Extract<AgentCardChild, { type: 'actions' }>['children'][number];
type CardButtonChild = Extract<AgentCardChild, { type: 'button' }>;

function isEnabledReviewButton(child: AgentCardChild | CardActionChild, actionId?: string): child is CardButtonChild {
  return (
    child.type === 'button' &&
    isCopilotReviewActionId(child.id) &&
    !child.disabled &&
    (actionId === undefined || child.id === actionId)
  );
}

/** Walks the containers the card renderer draws (`actions`, `section`, a bare `button`) for an enabled review button. */
function findEnabledReviewButton(children: readonly AgentCardChild[], actionId?: string): CardButtonChild | undefined {
  for (const child of children) {
    if (child.type === 'actions') {
      const button = child.children.find((action): action is CardButtonChild =>
        isEnabledReviewButton(action, actionId)
      );
      if (button) return button;
    } else if (child.type === 'section') {
      const button = findEnabledReviewButton(child.children, actionId);
      if (button) return button;
    } else if (isEnabledReviewButton(child, actionId)) {
      return child;
    }
  }

  return undefined;
}

/** The thread's newest card, unless a click on it is still waiting for the agent. */
function getClickableCard(
  messages: readonly AgentMessage[],
  pendingReviewMessageId?: string
): AgentCardPart | undefined {
  const card = getLastCardPart(messages);

  return card?.sourceMessageId === pendingReviewMessageId ? undefined : card;
}

/**
 * The `sourceMessageId` of the card whose Keep / Revert buttons the user can click now: the thread's newest card
 * (answering a click, or a stopped run's follow-up, posts a newer buttonless card that supersedes it) while its
 * click is not pending. Mirrors when `CopilotCardBlock` renders those buttons enabled, minus its `isBusy` lock.
 */
export function getOpenReviewCard(
  messages: readonly AgentMessage[],
  pendingReviewMessageId?: string
): string | undefined {
  const card = getClickableCard(messages, pendingReviewMessageId);

  return card && findEnabledReviewButton(card.card.children) ? card.sourceMessageId : undefined;
}

/**
 * The click `CopilotCardBlock` sends for the open review card's `actionId` button, with the button's own `value`, or
 * `undefined` when no card is open or it does not offer that button.
 */
export function getOpenReviewAction(
  messages: readonly AgentMessage[],
  actionId: CopilotReviewActionEnum,
  pendingReviewMessageId?: string
): CopilotCardAction | undefined {
  const card = getClickableCard(messages, pendingReviewMessageId);
  const button = card && findEnabledReviewButton(card.card.children, actionId);

  return card && button
    ? { actionId: button.id, sourceMessageId: card.sourceMessageId, value: button.value }
    : undefined;
}

/** The text of the last user message before the message that holds the card. */
function getPromptBeforeCard(messages: readonly AgentMessage[], sourceMessageId: string): string | undefined {
  const cardIndex = messages.findIndex((message) =>
    message.parts.some((part) => part.type === 'card' && part.sourceMessageId === sourceMessageId)
  );

  for (let index = cardIndex - 1; index >= 0; index--) {
    if (messages[index].role === 'user') return getUserMessageText(messages[index]) || undefined;
  }

  return undefined;
}

function readPromptMessageId(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null) return undefined;

  const { promptMessageId } = data as { promptMessageId?: unknown };

  return typeof promptMessageId === 'string' ? promptMessageId : undefined;
}

/**
 * The prompt a Try again click resends: the user message the Copilot's ready event names. The user may have sent
 * another one before a stopped turn's card arrived, so the last user message before the card is only the fallback.
 */
export function getTryAgainPrompt(
  messages: readonly AgentMessage[],
  readyEventData: unknown,
  cardSourceMessageId: string
): string | undefined {
  const promptMessageId = readPromptMessageId(readyEventData);
  const prompt = messages.find((message) => message.role === 'user' && message.id === promptMessageId);

  return (prompt && getUserMessageText(prompt)) || getPromptBeforeCard(messages, cardSourceMessageId);
}

/** The last message is a user send the server never accepted (it stays in the thread and can be retried). */
export function getFailedSend(messages: readonly AgentMessage[]): AgentMessage | undefined {
  const last = messages[messages.length - 1];

  return last?.role === 'user' && last.status === 'failed' ? last : undefined;
}

/** Whether the thread still needs a placeholder: nothing from the agent is visible after the last user message. */
export function hasPendingReplyGap(messages: readonly AgentMessage[]): boolean {
  const last = messages[messages.length - 1];
  if (!last) return false;
  if (last.role === 'user') return last.status !== 'failed';

  return buildAssistantBlocks(last).length === 0;
}

export function getUserMessageText(message: AgentMessage): string {
  return message.parts
    .map((part) => (part.type === 'text' ? part.text : ''))
    .join('')
    .trim();
}
