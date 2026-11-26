import type { AgentMessage } from '@novu/js';
import {
  COPILOT_STEP_EVENT,
  type CopilotStepEventData,
  CopilotWorkflowChangeEnum,
  type CopilotWorkflowStepChange,
  type StepTypeEnum,
} from '@novu/shared';
import { getOpenReviewActions } from './copilot-web-chat-utils';

/** A user message and the assistant messages that answer it, up to the next user message. */
export type CopilotTurn = { key: string; prompt?: AgentMessage; replies: AgentMessage[] };

const CHANGE_KINDS: ReadonlySet<string> = new Set(Object.values(CopilotWorkflowChangeEnum));

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function readChange(value: unknown): CopilotWorkflowStepChange | undefined {
  if (typeof value !== 'object' || value === null) return undefined;

  const { kind, stepId, stepName, stepType } = value as Record<string, unknown>;
  const isValid =
    typeof kind === 'string' &&
    CHANGE_KINDS.has(kind) &&
    isNonEmptyString(stepId) &&
    typeof stepName === 'string' &&
    isNonEmptyString(stepType);

  return isValid
    ? {
        kind: kind as CopilotWorkflowChangeEnum,
        stepId,
        stepName,
        stepType: stepType as StepTypeEnum,
      }
    : undefined;
}

/** The data of a `copilot.step` event, or `undefined` when it is not one the checklist can read. */
export function readCopilotStepEvent(data: unknown): CopilotStepEventData | undefined {
  if (typeof data !== 'object' || data === null) return undefined;

  const { id, label, detail, change, isError, elapsedMs } = data as Record<string, unknown>;
  if (!isNonEmptyString(id) || !isNonEmptyString(label)) return undefined;

  const stepChange = readChange(change);

  return {
    id,
    label,
    ...(isNonEmptyString(detail) ? { detail } : {}),
    ...(stepChange ? { change: stepChange } : {}),
    ...(isError === true ? { isError } : {}),
    elapsedMs: typeof elapsedMs === 'number' && Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0,
  };
}

/** The steps a turn's replies list, in order. A call the agent retried sends its id again and replaces its row. */
export function collectTurnSteps(replies: readonly AgentMessage[]): CopilotStepEventData[] {
  const steps: CopilotStepEventData[] = [];

  for (const message of replies) {
    for (const part of message.parts) {
      if (part.type !== 'data' || part.name !== COPILOT_STEP_EVENT) continue;

      const step = readCopilotStepEvent(part.data);
      if (!step) continue;

      const index = steps.findIndex((existing) => existing.id === step.id);
      if (index < 0) steps.push(step);
      else steps[index] = step;
    }
  }

  return steps;
}

function mergeChangeKind(
  earlier: CopilotWorkflowChangeEnum,
  later: CopilotWorkflowChangeEnum
): CopilotWorkflowChangeEnum | undefined {
  if (earlier === CopilotWorkflowChangeEnum.ADDED) {
    // A step the turn added and then removed again was never there for the user.
    return later === CopilotWorkflowChangeEnum.REMOVED ? undefined : earlier;
  }
  if (earlier === CopilotWorkflowChangeEnum.REMOVED) {
    // Removed and added back under its id: the step is still there, replaced.
    return later === CopilotWorkflowChangeEnum.ADDED ? CopilotWorkflowChangeEnum.EDITED : earlier;
  }
  if (later === CopilotWorkflowChangeEnum.REMOVED) return later;
  if (earlier === CopilotWorkflowChangeEnum.EDITED || later === CopilotWorkflowChangeEnum.EDITED) {
    return CopilotWorkflowChangeEnum.EDITED;
  }

  return CopilotWorkflowChangeEnum.MOVED;
}

/** What the turn did to each step it touched: one row per step, in the order the turn first changed them. */
export function collectChangeRows(steps: readonly CopilotStepEventData[]): CopilotWorkflowStepChange[] {
  const rows: CopilotWorkflowStepChange[] = [];

  for (const { change } of steps) {
    if (!change) continue;

    const index = rows.findIndex((row) => row.stepId === change.stepId);
    if (index < 0) {
      rows.push(change);
      continue;
    }

    const kind = mergeChangeKind(rows[index].kind, change.kind);
    if (kind) rows[index] = { ...change, kind };
    else rows.splice(index, 1);
  }

  return rows;
}

/** The "Thought for Xs" of a turn: until its last step ended, at least a second. */
export function getThoughtSeconds(steps: readonly CopilotStepEventData[]): number | undefined {
  if (steps.length === 0) return undefined;

  const elapsedMs = Math.max(...steps.map((step) => step.elapsedMs));

  return Math.max(1, Math.round(elapsedMs / 1000));
}

/** Where the replies to the user message before `index` start: right after it, or at 0 when there is none. */
function findRepliesStart(messages: readonly AgentMessage[], index: number): number {
  let start = index;
  while (start > 0 && messages[start - 1].role !== 'user') start--;

  return start;
}

function hasCard(message: AgentMessage): boolean {
  return message.parts.some((part) => part.type === 'card');
}

function hasText(message: AgentMessage): boolean {
  return message.parts.some((part) => part.type === 'text' && part.text.trim().length > 0);
}

/**
 * The steps of the turn a card ends: what the agent listed since the user message before the card. A card only lands
 * after a newer message when it is a stopped turn's, which the agent posts once the stop settled; so a card that the
 * newer turn has not replied (or stopped) before goes to the stopped turn ahead of it, when that one has no card yet.
 */
export function getCardTurnSteps(messages: readonly AgentMessage[], sourceMessageId: string): CopilotStepEventData[] {
  const cardIndex = messages.findIndex((message) =>
    message.parts.some((part) => part.type === 'card' && part.sourceMessageId === sourceMessageId)
  );
  if (cardIndex < 0) return [];

  const start = findRepliesStart(messages, cardIndex);
  const repliesBefore = messages.slice(start, cardIndex);
  const promptIndex = start - 1;
  if (promptIndex > 0 && !repliesBefore.some((message) => message.stopped || hasText(message))) {
    const earlierTurn = messages.slice(findRepliesStart(messages, promptIndex), promptIndex);
    const isLateStoppedCard =
      earlierTurn.some((message) => message.stopped) && !earlierTurn.some((message) => hasCard(message));

    if (isLateStoppedCard) return collectTurnSteps(earlierTurn);
  }

  return collectTurnSteps(messages.slice(start, cardIndex + 1));
}

/** The review card the canvas reviews: the thread's open one, also while a click on it waits for the agent. */
export function getOpenReviewSourceMessageId(messages: readonly AgentMessage[]): string | undefined {
  const { keep, revert } = getOpenReviewActions(messages);

  return keep?.sourceMessageId ?? revert?.sourceMessageId;
}

/**
 * The steps the canvas marks: what the turn the Copilot is answering changed so far, else what the open review card
 * holds. Once the review is answered, or another message applied it, the canvas marks none.
 */
export function getCanvasChanges(
  messages: readonly AgentMessage[],
  { isAnswering }: { isAnswering: boolean }
): CopilotWorkflowStepChange[] {
  if (isAnswering) {
    let start = messages.length;
    while (start > 0 && messages[start - 1].role !== 'user') start--;

    return collectChangeRows(collectTurnSteps(messages.slice(start)));
  }

  const sourceMessageId = getOpenReviewSourceMessageId(messages);

  return sourceMessageId ? collectChangeRows(getCardTurnSteps(messages, sourceMessageId)) : [];
}

/** Splits the thread into turns; assistant messages before the first user message form a turn without a prompt. */
export function groupCopilotTurns(messages: readonly AgentMessage[]): CopilotTurn[] {
  const turns: CopilotTurn[] = [];

  for (const message of messages) {
    if (message.role === 'user') {
      turns.push({ key: message.id, prompt: message, replies: [] });
      continue;
    }

    const current = turns[turns.length - 1];
    if (current) current.replies.push(message);
    else turns.push({ key: message.id, replies: [message] });
  }

  return turns;
}
