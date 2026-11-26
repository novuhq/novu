import type { AgentMessage, AgentMessagePart } from '@novu/js';
import {
  COPILOT_STEP_EVENT,
  COPILOT_WORKFLOW_UPDATED_EVENT,
  CopilotReviewActionEnum,
  type CopilotStepEventData,
  CopilotWorkflowChangeEnum,
  type CopilotWorkflowStepChange,
  StepTypeEnum,
} from '@novu/shared';
import { describe, expect, it } from 'vitest';
import {
  collectChangeRows,
  collectTurnSteps,
  getCanvasChanges,
  getCardTurnSteps,
  getThoughtSeconds,
  groupCopilotTurns,
  readCopilotStepEvent,
} from './copilot-steps';

const CREATED_AT = '2026-11-26T00:00:00.000Z';

function userMessage(id: string, text = 'Add a digest'): AgentMessage {
  return { id, role: 'user', parts: [{ type: 'text', text, state: 'done' }], createdAt: CREATED_AT, status: 'sent' };
}

function assistantMessage(id: string, parts: AgentMessagePart[]): AgentMessage {
  return { id, role: 'assistant', parts, createdAt: CREATED_AT, status: 'sent' };
}

function stepPart(data: Partial<CopilotStepEventData> & Pick<CopilotStepEventData, 'id' | 'label'>): AgentMessagePart {
  return { type: 'data', name: COPILOT_STEP_EVENT, data: { elapsedMs: 1000, ...data } };
}

function reviewCard(id: string): AgentMessage {
  const button = (actionId: CopilotReviewActionEnum) => ({
    type: 'button' as const,
    id: actionId,
    label: actionId,
    value: 'snap_1',
  });

  return assistantMessage(id, [
    {
      type: 'card',
      sourceMessageId: id,
      card: {
        type: 'card',
        children: [
          {
            type: 'actions',
            children: [
              button(CopilotReviewActionEnum.KEEP),
              button(CopilotReviewActionEnum.REVERT),
              button(CopilotReviewActionEnum.TRY_AGAIN),
            ],
          },
        ],
      },
    },
  ]);
}

function noteCard(id: string): AgentMessage {
  return assistantMessage(id, [
    {
      type: 'card',
      sourceMessageId: id,
      card: { type: 'card', children: [{ type: 'text', content: 'Kept the changes.' }] },
    },
  ]);
}

const DIGEST_ADDED: CopilotWorkflowStepChange = {
  kind: CopilotWorkflowChangeEnum.ADDED,
  stepId: 'digest-5m',
  stepName: 'Digest step',
  stepType: StepTypeEnum.DIGEST,
};
const EMAIL_EDITED: CopilotWorkflowStepChange = {
  kind: CopilotWorkflowChangeEnum.EDITED,
  stepId: 'email_r7c',
  stepName: 'Email step',
  stepType: StepTypeEnum.EMAIL,
};

describe('readCopilotStepEvent', () => {
  it('reads a step with its change and drops what it cannot read', () => {
    expect(
      readCopilotStepEvent({ id: 'call_1', label: 'Added Digest step', change: DIGEST_ADDED, elapsedMs: 2400 })
    ).toEqual({ id: 'call_1', label: 'Added Digest step', change: DIGEST_ADDED, elapsedMs: 2400 });
    expect(
      readCopilotStepEvent({ id: 'call_1', label: 'Edited', change: { ...EMAIL_EDITED, kind: 'renamed' } })
    ).toEqual({ id: 'call_1', label: 'Edited', elapsedMs: 0 });
  });

  it('keeps the plan of a reasoning step and marks a failed one', () => {
    expect(readCopilotStepEvent({ id: 'a', label: 'Plan', detail: 'Batch first.', elapsedMs: 5 })).toEqual({
      id: 'a',
      label: 'Plan',
      detail: 'Batch first.',
      elapsedMs: 5,
    });
    expect(readCopilotStepEvent({ id: 'b', label: 'Adding a step', isError: true, elapsedMs: -3 })).toEqual({
      id: 'b',
      label: 'Adding a step',
      isError: true,
      elapsedMs: 0,
    });
  });

  it('skips data that is not a step', () => {
    expect(readCopilotStepEvent(null)).toBeUndefined();
    expect(readCopilotStepEvent({ label: 'No id' })).toBeUndefined();
    expect(readCopilotStepEvent({ id: 'a', label: '' })).toBeUndefined();
  });
});

describe('collectTurnSteps', () => {
  it('lists the steps across the replies of a turn, in order, and skips other data parts', () => {
    const replies = [
      assistantMessage('run_1', [
        stepPart({ id: 'a', label: 'Read workflow' }),
        { type: 'data', name: COPILOT_WORKFLOW_UPDATED_EVENT, data: { workflowId: 'wf_1' } },
      ]),
      assistantMessage('msg_1', [
        { type: 'text', text: 'Done.', state: 'done' },
        stepPart({ id: 'b', label: 'Added' }),
      ]),
    ];

    expect(collectTurnSteps(replies).map((step) => step.id)).toEqual(['a', 'b']);
  });

  it('keeps one row for a call the agent retried, with the later outcome in place', () => {
    const replies = [
      assistantMessage('run_1', [
        stepPart({ id: 'a', label: 'Adding a step', isError: true }),
        stepPart({ id: 'b', label: 'Read workflow' }),
        stepPart({ id: 'a', label: 'Added Digest step', change: DIGEST_ADDED }),
      ]),
    ];

    expect(collectTurnSteps(replies)).toEqual([
      { id: 'a', label: 'Added Digest step', change: DIGEST_ADDED, elapsedMs: 1000 },
      { id: 'b', label: 'Read workflow', elapsedMs: 1000 },
    ]);
  });
});

describe('collectChangeRows', () => {
  const step = (id: string, change: CopilotWorkflowStepChange): CopilotStepEventData => ({
    id,
    label: id,
    change,
    elapsedMs: 0,
  });

  it('keeps one row per step, in the order the turn first changed them', () => {
    const rows = collectChangeRows([
      step('1', DIGEST_ADDED),
      step('2', EMAIL_EDITED),
      step('3', { ...DIGEST_ADDED, kind: CopilotWorkflowChangeEnum.EDITED, stepName: 'Digest 5m' }),
      { id: '4', label: 'Read workflow', elapsedMs: 0 },
    ]);

    expect(rows).toEqual([{ ...DIGEST_ADDED, stepName: 'Digest 5m' }, EMAIL_EDITED]);
  });

  it('drops a step the turn added and removed again, and lets a removal replace an edit', () => {
    const rows = collectChangeRows([
      step('1', DIGEST_ADDED),
      step('2', EMAIL_EDITED),
      step('3', { ...DIGEST_ADDED, kind: CopilotWorkflowChangeEnum.REMOVED }),
      step('4', { ...EMAIL_EDITED, kind: CopilotWorkflowChangeEnum.REMOVED }),
    ]);

    expect(rows).toEqual([{ ...EMAIL_EDITED, kind: CopilotWorkflowChangeEnum.REMOVED }]);
  });

  it('reads a step moved and edited as edited', () => {
    const moved = { ...EMAIL_EDITED, kind: CopilotWorkflowChangeEnum.MOVED };

    expect(collectChangeRows([step('1', moved), step('2', EMAIL_EDITED)])).toEqual([EMAIL_EDITED]);
    expect(collectChangeRows([step('1', moved), step('2', moved)])).toEqual([moved]);
  });
});

describe('getThoughtSeconds', () => {
  it('reads the end of the last step, rounded, and at least a second', () => {
    expect(getThoughtSeconds([])).toBeUndefined();
    expect(
      getThoughtSeconds([
        { id: 'a', label: 'a', elapsedMs: 5600 },
        { id: 'b', label: 'b', elapsedMs: 2100 },
      ])
    ).toBe(6);
    expect(getThoughtSeconds([{ id: 'a', label: 'a', elapsedMs: 120 }])).toBe(1);
  });
});

describe('groupCopilotTurns', () => {
  it('starts a turn at each user message', () => {
    const turns = groupCopilotTurns([
      assistantMessage('greeting', []),
      userMessage('msg_1'),
      assistantMessage('run_1', []),
      assistantMessage('msg_reply', []),
      userMessage('msg_2'),
    ]);

    expect(turns.map((turn) => [turn.key, turn.prompt?.id, turn.replies.map((reply) => reply.id)])).toEqual([
      ['greeting', undefined, ['greeting']],
      ['msg_1', 'msg_1', ['run_1', 'msg_reply']],
      ['msg_2', 'msg_2', []],
    ]);
  });
});

describe('getCardTurnSteps', () => {
  it('reads the steps of the turn the card ends, not those of an earlier turn', () => {
    const messages = [
      userMessage('msg_1'),
      assistantMessage('run_1', [stepPart({ id: 'old', label: 'Old' })]),
      reviewCard('card_1'),
      userMessage('msg_2'),
      assistantMessage('run_2', [stepPart({ id: 'new', label: 'New', change: EMAIL_EDITED })]),
      reviewCard('card_2'),
    ];

    expect(getCardTurnSteps(messages, 'card_2').map((step) => step.id)).toEqual(['new']);
    expect(getCardTurnSteps(messages, 'card_missing')).toEqual([]);
  });
});

describe('getCanvasChanges', () => {
  const firstTurn = [
    userMessage('msg_1'),
    assistantMessage('run_1', [stepPart({ id: 'a', label: 'Added', change: DIGEST_ADDED })]),
    reviewCard('card_1'),
  ];

  it('marks the steps of the open review', () => {
    expect(getCanvasChanges(firstTurn, { isAnswering: false })).toEqual([DIGEST_ADDED]);
  });

  it('marks none once the review was answered or a newer message applied it', () => {
    expect(getCanvasChanges([...firstTurn, noteCard('note_1')], { isAnswering: false })).toEqual([]);
    expect(getCanvasChanges([...firstTurn, userMessage('msg_2')], { isAnswering: false })).toEqual([]);
  });

  it('marks what the turn being answered changed so far, instead of the review it applied', () => {
    const answering = [
      ...firstTurn,
      userMessage('msg_2'),
      assistantMessage('run_2', [stepPart({ id: 'b', label: 'Edited', change: EMAIL_EDITED })]),
    ];

    expect(getCanvasChanges(answering, { isAnswering: true })).toEqual([EMAIL_EDITED]);
  });
});
