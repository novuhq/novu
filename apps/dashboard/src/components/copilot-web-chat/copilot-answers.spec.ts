import type { AgentCardChild, AgentMessage } from '@novu/js';
import {
  COPILOT_ANSWER_DETAILS_EVENT,
  COPILOT_RESULT_CARD_EVENT,
  COPILOT_RESULT_CARD_LIMITS,
  CopilotReviewActionEnum,
} from '@novu/shared';
import { describe, expect, it } from 'vitest';
import {
  formatCopilotThoughtFor,
  getCopilotAnswerText,
  getCopilotFollowUps,
  groupCopilotTurns,
  hasCopilotReviewCard,
  readCopilotAnswerDetails,
  readCopilotResultCard,
} from './copilot-answers';

const CREATED_AT = '2026-11-26T10:00:00.000Z';

function userMessage(id: string, text: string): AgentMessage {
  return { id, role: 'user', parts: [{ type: 'text', text, state: 'done' }], createdAt: CREATED_AT, status: 'sent' };
}

function assistantMessage(id: string, text: string, extra: Partial<AgentMessage> = {}): AgentMessage {
  return {
    id,
    role: 'assistant',
    parts: [{ type: 'text', text, state: 'done' }],
    createdAt: CREATED_AT,
    status: 'sent',
    ...extra,
  };
}

function withData(message: AgentMessage, name: string, data: unknown): AgentMessage {
  return { ...message, parts: [...message.parts, { type: 'data', name, data }] };
}

function cardMessage(id: string, children: AgentCardChild[]): AgentMessage {
  return {
    id,
    role: 'assistant',
    parts: [{ type: 'card', card: { type: 'card', children }, sourceMessageId: id }],
    createdAt: CREATED_AT,
    status: 'sent',
  };
}

const reviewCard = (id: string) =>
  cardMessage(id, [
    {
      type: 'actions',
      children: [
        { type: 'button', id: CopilotReviewActionEnum.KEEP, label: 'Keep', value: 'snapshot_1' },
        { type: 'button', id: CopilotReviewActionEnum.REVERT, label: 'Revert', value: 'snapshot_1' },
      ],
    },
  ]);
const noteCard = (id: string) => cardMessage(id, [{ type: 'text', content: 'Reverted the changes.', style: 'muted' }]);

const DETAILS = {
  thoughtMs: 6_200,
  thoughts: ['Check each step.'],
  followUps: [{ text: 'Connect push provider', url: 'https://dashboard.novu.co/integrations' }, { text: 'Test it' }],
};

const LIST_CARD = {
  type: 'list',
  title: 'Failed runs',
  items: [{ title: 'password-reset', description: 'user_123', status: { label: 'Failed', tone: 'error' } }],
};

describe('groupCopilotTurns', () => {
  it('pairs each user message with the replies up to the next one, with their details and result cards', () => {
    const turns = groupCopilotTurns([
      assistantMessage('welcome', 'Hi!'),
      userMessage('u1', 'Which runs failed?'),
      withData(assistantMessage('a1', 'One run failed.'), COPILOT_RESULT_CARD_EVENT, LIST_CARD),
      withData(assistantMessage('a2', ''), COPILOT_ANSWER_DETAILS_EVENT, DETAILS),
      userMessage('u2', 'Why?'),
    ]);

    expect(turns.map((turn) => [turn.key, turn.prompt?.id, turn.replies.map((reply) => reply.id)])).toEqual([
      ['welcome', undefined, ['welcome']],
      ['u1', 'u1', ['a1', 'a2']],
      ['u2', 'u2', []],
    ]);
    expect(turns[1].details).toEqual(DETAILS);
    expect(turns[1].resultCards).toEqual([LIST_CARD]);
    expect(turns[2].details).toBeUndefined();
  });

  it('keeps the newest answer details of a turn and skips data it cannot read', () => {
    const [turn] = groupCopilotTurns([
      userMessage('u1', 'Hi'),
      withData(
        withData(withData(assistantMessage('a1', 'Hello'), COPILOT_ANSWER_DETAILS_EVENT, DETAILS), 'other', { x: 1 }),
        COPILOT_ANSWER_DETAILS_EVENT,
        { ...DETAILS, followUps: [] }
      ),
      withData(assistantMessage('a2', ''), COPILOT_RESULT_CARD_EVENT, { type: 'list', title: 'Empty', items: [] }),
    ]);

    expect(turn.details?.followUps).toEqual([]);
    expect(turn.resultCards).toEqual([]);
  });
});

describe('readCopilotAnswerDetails', () => {
  it('reads valid details and drops what is malformed', () => {
    expect(
      readCopilotAnswerDetails({
        thoughtMs: -5,
        thoughts: ['  Plan  ', 3, ''],
        followUps: [{ text: ' A ' }, { text: '' }, 'B', { text: 'C', url: 7 }, { text: 'D' }, { text: 'E' }],
      })
    ).toEqual({ thoughtMs: 0, thoughts: ['Plan'], followUps: [{ text: 'A' }, { text: 'C' }, { text: 'D' }] });
  });

  it('is undefined for data that is not answer details', () => {
    expect(readCopilotAnswerDetails(null)).toBeUndefined();
    expect(readCopilotAnswerDetails({ thoughtMs: 'soon' })).toBeUndefined();
  });
});

describe('readCopilotResultCard', () => {
  it('reads a chart, keeping only series with a number for every category', () => {
    expect(
      readCopilotResultCard({
        type: 'chart',
        title: 'Runs per workflow',
        chart: 'bar',
        categories: ['Welcome', 'Payment failed'],
        series: [
          { name: 'Runs', values: [12, 3] },
          { name: 'Broken', values: [1] },
          { name: 'NaN', values: [1, Number.NaN] },
        ],
      })
    ).toEqual({
      type: 'chart',
      title: 'Runs per workflow',
      chart: 'bar',
      categories: ['Welcome', 'Payment failed'],
      series: [{ name: 'Runs', values: [12, 3] }],
    });
  });

  it('reads a list within the limit, with a neutral tone for one it does not know', () => {
    const card = readCopilotResultCard({
      type: 'list',
      title: 'Subscribers',
      items: [
        { title: 'Jane', status: { label: 'Reachable', tone: 'sparkly' }, ask: 'Check jane@acme.com', url: '/x' },
        ...Array.from({ length: 30 }, (_, index) => ({ title: `Subscriber ${index}` })),
      ],
    });

    expect(card?.type === 'list' && card.items[0]).toEqual({
      title: 'Jane',
      status: { label: 'Reachable', tone: 'neutral' },
      ask: 'Check jane@acme.com',
      url: '/x',
    });
    expect(card?.type === 'list' && card.items).toHaveLength(COPILOT_RESULT_CARD_LIMITS.listItems);
  });

  it('reads a checklist, keeping a fix only with an ask or a link', () => {
    expect(
      readCopilotResultCard({
        type: 'checklist',
        title: 'Ready to go live?',
        items: [
          { status: 'fail', label: 'Push provider', fix: { label: 'Connect', url: 'https://x/integrations' } },
          { status: 'warning', label: 'Email editor', fix: { label: 'Switch' } },
          { status: 'unknown', label: 'Dropped' },
        ],
      })
    ).toEqual({
      type: 'checklist',
      title: 'Ready to go live?',
      items: [
        { status: 'fail', label: 'Push provider', fix: { label: 'Connect', url: 'https://x/integrations' } },
        { status: 'warning', label: 'Email editor' },
      ],
    });
  });

  it('is undefined for an unknown type or a card without a title', () => {
    expect(readCopilotResultCard({ type: 'table', title: 'Rows' })).toBeUndefined();
    expect(readCopilotResultCard({ ...LIST_CARD, title: ' ' })).toBeUndefined();
  });
});

describe('getCopilotFollowUps', () => {
  const answered = (...replies: AgentMessage[]) =>
    groupCopilotTurns([userMessage('u1', 'Is it ready?'), ...replies])[0];
  const withDetails = (message: AgentMessage) => withData(message, COPILOT_ANSWER_DETAILS_EVENT, DETAILS);

  it("offers the turn's follow-ups, also while its review card waits for an answer", () => {
    expect(getCopilotFollowUps(answered(withDetails(assistantMessage('a1', 'Not yet.'))))).toEqual(DETAILS.followUps);
    expect(getCopilotFollowUps(answered(withDetails(assistantMessage('a1', 'Done.')), reviewCard('c1')))).toEqual(
      DETAILS.followUps
    );
  });

  it('offers none once the review card was answered, or the reply was stopped', () => {
    expect(
      getCopilotFollowUps(answered(withDetails(assistantMessage('a1', 'Done.')), reviewCard('c1'), noteCard('n1')))
    ).toEqual([]);
    expect(getCopilotFollowUps(answered(withDetails(assistantMessage('a1', 'Partial', { stopped: true }))))).toEqual(
      []
    );
  });
});

describe('getCopilotAnswerText and hasCopilotReviewCard', () => {
  it("joins the turn's text without the plan branding, and tells a turn that changed the workflow", () => {
    const turn = groupCopilotTurns([
      userMessage('u1', 'Add a digest'),
      assistantMessage('a1', 'Added a digest.\n\n_Powered by [Novu](https://novu.co)_'),
      assistantMessage('a2', 'It waits 5 minutes.'),
      reviewCard('c1'),
    ])[0];

    expect(getCopilotAnswerText(turn)).toBe('Added a digest.\n\nIt waits 5 minutes.');
    expect(hasCopilotReviewCard(turn)).toBe(true);
    expect(hasCopilotReviewCard(groupCopilotTurns([userMessage('u1', 'Hi'), assistantMessage('a1', 'Hi')])[0])).toBe(
      false
    );
  });
});

describe('formatCopilotThoughtFor', () => {
  it('rounds to whole seconds, at least one, and adds minutes past 60s', () => {
    expect(formatCopilotThoughtFor(200)).toBe('Thought for 1s');
    expect(formatCopilotThoughtFor(6_200)).toBe('Thought for 6s');
    expect(formatCopilotThoughtFor(65_000)).toBe('Thought for 1m 5s');
  });
});
