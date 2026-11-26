import type { AgentCardChild, AgentCardElement, AgentCardPart, AgentMessage, AgentToolPart } from '@novu/js';
import {
  AiWorkflowToolsEnum,
  CopilotAnswerToolEnum,
  type CopilotPageEnum,
  CopilotReviewActionEnum,
  type CopilotViewing,
  parseCopilotFixActionId,
  serializeCopilotViewing,
} from '@novu/shared';
import type { FC, SVGProps } from 'react';
import type { IconType } from 'react-icons';

// The plan branding the API appends to delivered replies (stored history has none), in the shapes it can take.
// Same pattern as the agents web-chat panel (`agent-message-to-thread-message.ts`), which strips it the same way.
const POWERED_BY =
  /(?:\n+)?(?:_*Powered by\s*\[[^\]]+\]\([^)]+\)_*|_*\[Powered by Novu\]\([^)]+\)_*|Powered by\s*<https?:\/\/[^|>]+\|[^>]+>|Powered by\s*<a\b[^>]*>[\s\S]*?<\/a>|Powered by Novu​?)\s*$/i;

function stripPoweredBy(text: string): string {
  return text.replace(POWERED_BY, '').trimEnd();
}

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

const ANSWER_TOOL_NAMES: ReadonlySet<string> = new Set(Object.values(CopilotAnswerToolEnum));

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
  /** A dashboard page outside the workflow editor that `COPILOT_PAGES` turns on, and what it shows. */
  page?: CopilotPageEnum;
  viewing?: CopilotViewing;
  /** Human readable ids shown in chips. Not sent to the agent. */
  workflowLabel?: string;
  stepLabel?: string;
  /** The question about what is open on the page; leads its suggestions. Not sent to the agent. */
  question?: string;
  /** The workflow editor's new-chat suggestions for the open workflow or step. Not sent to the agent. */
  suggestions?: CopilotSuggestion[];
};

export type CopilotSuggestion = { label: string; icon?: IconType | FC<SVGProps<SVGSVGElement>> };

export type CopilotMessageMetadata = {
  environmentId?: string;
  workflowId?: string;
  stepId?: string;
  page?: CopilotPageEnum;
  /** `CopilotViewing` as JSON (`serializeCopilotViewing`): web-chat metadata keeps only scalar values. */
  viewing?: string;
};

export function buildCopilotMetadata(
  context: CopilotPageContext | undefined,
  environmentId: string | undefined
): CopilotMessageMetadata {
  const metadata: CopilotMessageMetadata = {};

  // The hosted tenant context is shared across environments, so the agent reads the viewed one from here.
  if (environmentId) metadata.environmentId = environmentId;
  if (context?.workflowId) metadata.workflowId = context.workflowId;
  if (context?.stepId) metadata.stepId = context.stepId;
  if (context?.page) metadata.page = context.page;
  const viewing = serializeCopilotViewing(context?.viewing);
  if (viewing) metadata.viewing = viewing;

  return metadata;
}

/** The composer chip: the open resource on a page, the workflow and step in the editor. */
export function getCopilotContextLabel(context: CopilotPageContext | undefined): string {
  if (context?.page) return context.viewing?.resource?.label ?? '';

  return [context?.workflowLabel, context?.stepLabel].filter(Boolean).join(' / ');
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

/** DOM id of the popover, so the launcher can tell when the focus sits in it while it animates out. */
export const COPILOT_POPOVER_ID = 'copilot-popover';

/** Over a sheet, the launcher and popover rise clear of its 57px footer, gliding with the sheet's 500ms slide-in. */
export const COPILOT_SHEET_LIFT_PX = 57;
export const COPILOT_SHEET_LIFT_TRANSITION = { duration: 0.5, ease: 'easeInOut' } as const;

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

/**
 * Groups consecutive tool parts into one block and drops parts this UI does not render: the "Powered by Novu" footer
 * the API appends to replies (it is in the saved text, so restored threads carry it too), and the calls that only
 * put buttons under the reply, whose card shows instead.
 */
export function buildAssistantBlocks(message: AgentMessage): AssistantBlock[] {
  const blocks: AssistantBlock[] = [];

  message.parts.forEach((part, index) => {
    const key = `${message.id}:${index}`;

    if (part.type === 'text') {
      const text = stripPoweredBy(part.text);
      if (!text.trim()) return;
      blocks.push({ kind: 'text', key, text, streaming: part.state === 'streaming' });
    } else if (part.type === 'thinking') {
      blocks.push({ kind: 'thinking', key, text: part.text, streaming: part.state === 'streaming' });
    } else if (part.type === 'tool') {
      if (ANSWER_TOOL_NAMES.has(normalizeToolName(part.toolName))) return;

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

type CardActionChild = Extract<AgentCardChild, { type: 'actions' }>['children'][number];
type CardButtonChild = Extract<AgentCardChild, { type: 'button' }>;
type CardLinkButtonChild = Extract<CardActionChild, { type: 'link-button' }>;

function isCardButton(child: AgentCardChild | CardActionChild): child is CardButtonChild | CardLinkButtonChild {
  return child.type === 'button' || child.type === 'link-button';
}

/** The buttons the card renderer draws: in `actions`, in a `section`, or bare. */
function listCardButtons(children: readonly AgentCardChild[]): Array<CardButtonChild | CardLinkButtonChild> {
  return children.flatMap((child) => {
    if (child.type === 'actions') return child.children.filter(isCardButton);
    if (child.type === 'section') return listCardButtons(child.children);

    return isCardButton(child) ? [child] : [];
  });
}

/**
 * Whether a card takes part in the review: it holds the Keep / Revert / Try again buttons, or it is the buttonless
 * note that answered a click. A card of next steps or of a review's issues leaves the review buttons above it open.
 */
function isReviewCard(card: AgentCardElement): boolean {
  const buttons = listCardButtons(card.children);

  return (
    buttons.length === 0 || buttons.some((button) => button.type === 'button' && isCopilotReviewActionId(button.id))
  );
}

function getLastReviewCardPart(messages: readonly AgentMessage[]): AgentCardPart | undefined {
  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex--) {
    const parts = messages[messageIndex].parts;

    for (let partIndex = parts.length - 1; partIndex >= 0; partIndex--) {
      const part = parts[partIndex];
      if (part.type === 'card' && isReviewCard(part.card)) return part;
    }
  }

  return undefined;
}

/** The `sourceMessageId` of the newest review card in the thread; review buttons are only offered on that card. */
export function getReviewCardSourceMessageId(messages: readonly AgentMessage[]): string | undefined {
  return getLastReviewCardPart(messages)?.sourceMessageId;
}

/** One issue of a workflow review: a row with the step it is on and a Fix button that sends `fix`. */
export type CopilotIssueRow = { stepId?: string; stepName?: string; title: string; fix: string };

/** The issues a review card lists, one per section that holds a Fix button; none for any other card. */
export function readCopilotIssueRows(card: AgentCardElement): CopilotIssueRow[] {
  return card.children.flatMap((child): CopilotIssueRow[] => {
    if (child.type !== 'section') return [];

    const fixButton = listCardButtons(child.children).find(
      (button): button is CardButtonChild =>
        button.type === 'button' && parseCopilotFixActionId(button.id) !== undefined && !!button.value
    );
    const title = child.children.find((item) => item.type === 'text');
    if (!fixButton?.value || title?.type !== 'text') return [];

    const fields = child.children.flatMap((item) => (item.type === 'fields' ? item.children : []));
    const stepName = fields.find((field) => field.label === 'Step')?.value;

    return [{ ...parseCopilotFixActionId(fixButton.id), stepName, title: title.content, fix: fixButton.value }];
  });
}

/**
 * The issues of the thread's newest workflow review that are still open: the user hasn't sent an issue's fix (a
 * click on its Fix button sends it as is) since the review was posted.
 */
export function getOpenCopilotIssues(messages: readonly AgentMessage[]): CopilotIssueRow[] {
  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex--) {
    const rows = messages[messageIndex].parts.flatMap((part) =>
      part.type === 'card' ? readCopilotIssueRows(part.card) : []
    );
    if (rows.length === 0) continue;

    const sentSince = new Set(
      messages
        .slice(messageIndex + 1)
        .filter((message) => message.role === 'user')
        .map(getUserMessageText)
    );

    return rows.filter((row) => !sentSince.has(row.fix));
  }

  return [];
}

/** How many open issues each step has, as `[stepId, count]` pairs in step order of first mention. */
export function countCopilotIssuesByStep(rows: readonly CopilotIssueRow[]): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const { stepId } of rows) {
    if (stepId) counts.set(stepId, (counts.get(stepId) ?? 0) + 1);
  }

  return [...counts];
}

function isEnabledReviewButton(child: AgentCardChild | CardActionChild): child is CardButtonChild {
  return child.type === 'button' && isCopilotReviewActionId(child.id) && !child.disabled;
}

/** Walks the containers the card renderer draws (`actions`, `section`, a bare `button`) for enabled review buttons. */
function listEnabledReviewButtons(children: readonly AgentCardChild[]): CardButtonChild[] {
  return children.flatMap((child) => {
    if (child.type === 'actions') return child.children.filter(isEnabledReviewButton);
    if (child.type === 'section') return listEnabledReviewButtons(child.children);

    return isEnabledReviewButton(child) ? [child] : [];
  });
}

export type OpenReviewActions = { keep?: CopilotCardAction; revert?: CopilotCardAction };

/**
 * The clicks `CopilotCardBlock` sends for the Keep / Revert buttons the user can click now, each with its button's
 * own `value`. Only the thread's newest card offers them (answering a click, or a stopped run's follow-up, posts a
 * newer buttonless card that supersedes it), and not while a click on it is still waiting for the agent. Mirrors when
 * the card renders those buttons enabled, minus its `isBusy` lock.
 */
export function getOpenReviewActions(
  messages: readonly AgentMessage[],
  pendingReviewMessageId?: string
): OpenReviewActions {
  const card = getLastReviewCardPart(messages);

  if (!card || card.sourceMessageId === pendingReviewMessageId) return {};

  const buttons = listEnabledReviewButtons(card.card.children);
  const toAction = (actionId: CopilotReviewActionEnum): CopilotCardAction | undefined => {
    const button = buttons.find((candidate) => candidate.id === actionId);

    return button ? { actionId: button.id, sourceMessageId: card.sourceMessageId, value: button.value } : undefined;
  };

  return { keep: toAction(CopilotReviewActionEnum.KEEP), revert: toAction(CopilotReviewActionEnum.REVERT) };
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

function findNamedPrompt(messages: readonly AgentMessage[], readyEventData: unknown): AgentMessage | undefined {
  const promptMessageId = readPromptMessageId(readyEventData);

  return messages.find((message) => message.role === 'user' && message.id === promptMessageId);
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
  const prompt = findNamedPrompt(messages, readyEventData);

  return (prompt && getUserMessageText(prompt)) || getPromptBeforeCard(messages, cardSourceMessageId);
}

const MAX_TRY_AGAIN_HISTORY_PAGES = 20;

type OlderHistoryPage = { data?: { messages: AgentMessage[]; hasMore: boolean }; error?: unknown };

/**
 * {@link getTryAgainPrompt}, after loading older history until the named prompt is in it: a resumed chat holds only
 * the newest page, and resending a nearby message instead would rebuild something the user did not ask for.
 */
export async function loadTryAgainPrompt({
  messages,
  hasMore,
  fetchMore,
  readyEventData,
  cardSourceMessageId,
}: {
  messages: readonly AgentMessage[];
  hasMore: boolean;
  fetchMore: () => Promise<OlderHistoryPage>;
  readyEventData: unknown;
  cardSourceMessageId: string;
}): Promise<string | undefined> {
  let loaded = messages;
  let canLoadMore = hasMore;

  for (
    let page = 0;
    readPromptMessageId(readyEventData) &&
    !findNamedPrompt(loaded, readyEventData) &&
    canLoadMore &&
    page < MAX_TRY_AGAIN_HISTORY_PAGES;
    page++
  ) {
    const { data, error } = await fetchMore();
    if (error || !data) break;

    loaded = data.messages;
    canLoadMore = data.hasMore;
  }

  return getTryAgainPrompt(loaded, readyEventData, cardSourceMessageId);
}

/** The last message is a user send the server never accepted (it stays in the thread and can be retried). */
export function getFailedSend(messages: readonly AgentMessage[]): AgentMessage | undefined {
  const last = messages[messages.length - 1];

  return last?.role === 'user' && last.status === 'failed' ? last : undefined;
}

// The API sends this default typing status for every agent; the Copilot shows its own label instead.
const PLATFORM_DEFAULT_TYPING_STATUS = /^thinking(\.\.\.|…)$/i;

/** The agent's typing status to show, or `undefined` for the Copilot's default label. */
export function getCopilotTypingLabel(status: string | undefined): string | undefined {
  const trimmed = status?.trim();
  if (!trimmed || PLATFORM_DEFAULT_TYPING_STATUS.test(trimmed)) return undefined;

  return trimmed;
}

/** Whether the thread still needs a placeholder: nothing from the agent is visible after the last user message. */
export function hasPendingReplyGap(messages: readonly AgentMessage[]): boolean {
  const last = messages[messages.length - 1];
  if (!last) return false;
  if (last.role === 'user') return last.status !== 'failed';

  return buildAssistantBlocks(last).length === 0;
}

function isCardMessage(message: AgentMessage): boolean {
  return message.role === 'assistant' && message.parts.some((part) => part.type === 'card');
}

/** An assistant reply that shows text (a "Powered by" footer alone does not count) and holds no card. */
function isTextReply(message: AgentMessage): boolean {
  return (
    message.role === 'assistant' &&
    !message.stopped &&
    !isCardMessage(message) &&
    buildAssistantBlocks(message).some((block) => block.kind === 'text')
  );
}

/**
 * A stopped run can save its review card before the tail of its partial reply lands, and `@novu/js` then keeps the
 * stop mark where it was, so the turn reads "Stopped", the card, then the text. This moves the reply that lands right
 * after the card(s) in front of them and hands it the mark, as `@novu/js` does when no card is in between: text,
 * "Stopped", then the card(s). History replays in the same order, so live and restored threads match.
 */
export function orderStoppedTurns(messages: readonly AgentMessage[]): AgentMessage[] {
  const ordered: AgentMessage[] = [];
  let index = 0;

  while (index < messages.length) {
    const message = messages[index];
    let cardsEnd = index + 1;
    if (message.role === 'assistant' && message.stopped) {
      while (cardsEnd < messages.length && isCardMessage(messages[cardsEnd])) cardsEnd++;
    }
    const lateReply = messages[cardsEnd];

    if (cardsEnd === index + 1 || !lateReply || !isTextReply(lateReply)) {
      ordered.push(message);
      index++;
      continue;
    }

    // A message with no parts was only the placeholder that carried the mark.
    if (message.parts.length > 0) ordered.push({ ...message, stopped: undefined });
    ordered.push({ ...lateReply, stopped: true }, ...messages.slice(index + 1, cardsEnd));
    index = cardsEnd + 1;
  }

  return ordered;
}

export function getUserMessageText(message: AgentMessage): string {
  return message.parts
    .map((part) => (part.type === 'text' ? part.text : ''))
    .join('')
    .trim();
}

export type CopilotLinkKind = 'dashboard' | 'external' | 'text';

/**
 * How the Copilot shows a link in its reply: a dashboard page opens in place and keeps the chat, another site asks
 * first, and anything else stays plain text, such as an email address the markdown turned into a mail link.
 */
export function getCopilotLinkKind(href: string | undefined, origin: string): CopilotLinkKind {
  if (!href) return 'text';

  let url: URL;
  try {
    url = new URL(href, origin);
  } catch {
    return 'text';
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'text';

  return url.origin === origin ? 'dashboard' : 'external';
}

/** A click that asks the browser for another tab or window keeps the browser's behaviour. */
export function isModifiedClick(event: Pick<MouseEvent, 'button' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>) {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}
