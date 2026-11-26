import type { AgentCardChild, AgentMessage } from '@novu/js';
import {
  COPILOT_ANSWER_DETAILS_EVENT,
  COPILOT_FOLLOW_UPS_LIMIT,
  COPILOT_RESULT_CARD_EVENT,
  COPILOT_RESULT_CARD_LIMITS,
  type CopilotAnswerDetails,
  type CopilotChecklistItem,
  type CopilotFollowUp,
  type CopilotResultAction,
  type CopilotResultCard,
  type CopilotResultListItem,
  type CopilotResultTone,
} from '@novu/shared';
import { buildAssistantBlocks, isCopilotReviewActionId } from './copilot-web-chat-utils';

/** A user message and the assistant messages that answer it; the thread's first turn may have no prompt. */
export type CopilotTurn = {
  key: string;
  prompt?: AgentMessage;
  replies: AgentMessage[];
  /** The newest answer details the agent sent for the turn. */
  details?: CopilotAnswerDetails;
  resultCards: CopilotResultCard[];
};

const TONES = new Set<string>(['success', 'warning', 'error', 'neutral']);
const CHECK_STATUSES = new Set<string>(['pass', 'warning', 'fail']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function readText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readFollowUp(value: unknown): CopilotFollowUp | undefined {
  if (!isRecord(value)) return undefined;

  const text = readText(value.text);
  if (!text) return undefined;

  const url = readText(value.url);

  return url ? { text, url } : { text };
}

/** The data of a `COPILOT_ANSWER_DETAILS_EVENT`, or `undefined` when it isn't one. */
export function readCopilotAnswerDetails(data: unknown): CopilotAnswerDetails | undefined {
  if (!isRecord(data) || typeof data.thoughtMs !== 'number' || !Number.isFinite(data.thoughtMs)) return undefined;

  const thoughts = Array.isArray(data.thoughts) ? data.thoughts.flatMap((thought) => readText(thought) ?? []) : [];
  const followUps = Array.isArray(data.followUps)
    ? data.followUps.flatMap((followUp) => readFollowUp(followUp) ?? []).slice(0, COPILOT_FOLLOW_UPS_LIMIT)
    : [];

  return { thoughtMs: Math.max(0, data.thoughtMs), thoughts, followUps };
}

function readAction(value: unknown): CopilotResultAction | undefined {
  if (!isRecord(value)) return undefined;

  const label = readText(value.label);
  const ask = readText(value.ask);
  const url = readText(value.url);
  if (!label) return undefined;
  if (ask) return { label, ask };

  return url ? { label, url } : undefined;
}

function readListItem(value: unknown): CopilotResultListItem | undefined {
  if (!isRecord(value)) return undefined;

  const title = readText(value.title);
  if (!title) return undefined;

  const description = readText(value.description);
  const ask = readText(value.ask);
  const url = readText(value.url);
  const status = isRecord(value.status) ? value.status : undefined;
  const statusLabel = readText(status?.label);
  const tone =
    typeof status?.tone === 'string' && TONES.has(status.tone) ? (status.tone as CopilotResultTone) : 'neutral';

  return {
    title,
    ...(description ? { description } : {}),
    ...(statusLabel ? { status: { label: statusLabel, tone } } : {}),
    ...(ask ? { ask } : {}),
    ...(url ? { url } : {}),
  };
}

function readChecklistItem(value: unknown): CopilotChecklistItem | undefined {
  if (!isRecord(value) || typeof value.status !== 'string' || !CHECK_STATUSES.has(value.status)) return undefined;

  const label = readText(value.label);
  if (!label) return undefined;

  const description = readText(value.description);
  const fix = readAction(value.fix);

  return {
    status: value.status as CopilotChecklistItem['status'],
    label,
    ...(description ? { description } : {}),
    ...(fix ? { fix } : {}),
  };
}

function readChart(data: Record<string, unknown>, title: string): CopilotResultCard | undefined {
  const chart = data.chart === 'line' ? 'line' : 'bar';
  const categories = Array.isArray(data.categories)
    ? data.categories
        .slice(0, COPILOT_RESULT_CARD_LIMITS.chartCategories)
        .map((category) => (typeof category === 'string' ? category : String(category)))
    : [];
  const series = Array.isArray(data.series)
    ? data.series
        .flatMap((entry) => {
          if (!isRecord(entry) || !Array.isArray(entry.values)) return [];

          const values = entry.values.slice(0, categories.length);
          const isComplete = values.length === categories.length && values.every(Number.isFinite);

          return isComplete ? [{ name: readText(entry.name) ?? title, values: values as number[] }] : [];
        })
        .slice(0, COPILOT_RESULT_CARD_LIMITS.chartSeries)
    : [];

  return categories.length > 0 && series.length > 0 ? { type: 'chart', title, chart, categories, series } : undefined;
}

/** The data of a `COPILOT_RESULT_CARD_EVENT`, within the card limits, or `undefined` when nothing in it can be drawn. */
export function readCopilotResultCard(data: unknown): CopilotResultCard | undefined {
  if (!isRecord(data)) return undefined;

  const title = readText(data.title);
  if (!title) return undefined;

  if (data.type === 'chart') return readChart(data, title);

  if (data.type === 'list') {
    const items = Array.isArray(data.items)
      ? data.items.flatMap((item) => readListItem(item) ?? []).slice(0, COPILOT_RESULT_CARD_LIMITS.listItems)
      : [];

    return items.length > 0 ? { type: 'list', title, items } : undefined;
  }

  if (data.type === 'checklist') {
    const items = Array.isArray(data.items)
      ? data.items.flatMap((item) => readChecklistItem(item) ?? []).slice(0, COPILOT_RESULT_CARD_LIMITS.checklistItems)
      : [];

    return items.length > 0 ? { type: 'checklist', title, items } : undefined;
  }

  return undefined;
}

function collectTurnData(replies: readonly AgentMessage[]): Pick<CopilotTurn, 'details' | 'resultCards'> {
  let details: CopilotAnswerDetails | undefined;
  const resultCards: CopilotResultCard[] = [];

  for (const reply of replies) {
    for (const part of reply.parts) {
      if (part.type !== 'data') continue;

      if (part.name === COPILOT_ANSWER_DETAILS_EVENT) {
        details = readCopilotAnswerDetails(part.data) ?? details;
      } else if (part.name === COPILOT_RESULT_CARD_EVENT) {
        const card = readCopilotResultCard(part.data);
        if (card) resultCards.push(card);
      }
    }
  }

  return { details, resultCards };
}

/** Splits the thread into turns: each user message with the assistant messages after it, up to the next one. */
export function groupCopilotTurns(messages: readonly AgentMessage[]): CopilotTurn[] {
  const groups: Array<{ prompt?: AgentMessage; replies: AgentMessage[] }> = [];

  for (const message of messages) {
    const current = groups[groups.length - 1];

    if (message.role === 'user') groups.push({ prompt: message, replies: [] });
    else if (current) current.replies.push(message);
    else groups.push({ replies: [message] });
  }

  return groups.map((group) => ({
    key: group.prompt?.id ?? group.replies[0]?.id ?? '',
    ...group,
    ...collectTurnData(group.replies),
  }));
}

/** The answer's text as the thread shows it, paragraphs apart, for Copy. */
export function getCopilotAnswerText(turn: CopilotTurn): string {
  return turn.replies
    .flatMap((reply) => buildAssistantBlocks(reply).flatMap((block) => (block.kind === 'text' ? [block.text] : [])))
    .join('\n\n')
    .trim();
}

/** The containers the card renderer draws (`actions`, `section`, a bare `button`), walked for a review button. */
function hasReviewButton(children: readonly AgentCardChild[]): boolean {
  return children.some((child) => {
    if (child.type === 'actions') {
      return child.children.some((action) => action.type === 'button' && isCopilotReviewActionId(action.id));
    }

    if (child.type === 'section') return hasReviewButton(child.children);

    return child.type === 'button' && isCopilotReviewActionId(child.id);
  });
}

function isReviewCard(reply: AgentMessage): boolean {
  return reply.parts.some((part) => part.type === 'card' && hasReviewButton(part.card.children));
}

/**
 * The id of the reply that holds the answer's text: unlike the turn's last reply, it stays the same when a review
 * click adds its note to the turn.
 */
export function getCopilotAnswerId(turn: CopilotTurn): string {
  const answer = turn.replies.find((reply) => buildAssistantBlocks(reply).some((block) => block.kind === 'text'));

  return answer?.id ?? turn.key;
}

/** Whether the turn changed the workflow: its Keep / Revert / Try again card then offers a retry of its own. */
export function hasCopilotReviewCard(turn: CopilotTurn): boolean {
  return turn.replies.some(isReviewCard);
}

/**
 * The follow-ups to offer under the turn: none once a reply was stopped, or once the user answered the turn's review
 * card, whose note (a card without buttons) then comes last.
 */
export function getCopilotFollowUps(turn: CopilotTurn): CopilotFollowUp[] {
  const followUps = turn.details?.followUps ?? [];
  if (followUps.length === 0 || turn.replies.some((reply) => reply.stopped)) return [];

  const lastCardReply = [...turn.replies].reverse().find((reply) => reply.parts.some((part) => part.type === 'card'));
  const isReviewAnswered = hasCopilotReviewCard(turn) && !!lastCardReply && !isReviewCard(lastCardReply);

  return isReviewAnswered ? [] : followUps;
}

/** The newest turn's follow-ups, once its answer settled; the chips and the composer's ghost text both offer them. */
export function getSettledCopilotFollowUps(
  turns: readonly CopilotTurn[],
  { isBusy, hasRunError }: { isBusy: boolean; hasRunError: boolean }
): CopilotFollowUp[] {
  const latest = turns[turns.length - 1];

  return latest && !isBusy && !hasRunError ? getCopilotFollowUps(latest) : [];
}

/** "Thought for 6s", "Thought for 1m 5s"; under a second reads as 1s. */
export function formatCopilotThoughtFor(thoughtMs: number): string {
  const seconds = Math.max(1, Math.round(thoughtMs / 1000));
  const minutes = Math.floor(seconds / 60);

  return minutes > 0 ? `Thought for ${minutes}m ${seconds % 60}s` : `Thought for ${seconds}s`;
}
