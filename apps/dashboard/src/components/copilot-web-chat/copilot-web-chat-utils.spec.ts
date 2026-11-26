import type { AgentCardChild, AgentMessage } from '@novu/js';
import {
  buildCopilotFixActionId,
  COPILOT_ASK_ACTION_ID,
  CopilotAnswerToolEnum,
  CopilotPageEnum,
  CopilotReviewActionEnum,
  CopilotViewingResourceEnum,
} from '@novu/shared';
import { describe, expect, it, vi } from 'vitest';
import {
  buildAssistantBlocks,
  buildCopilotMetadata,
  countCopilotIssuesByStep,
  getCopilotContextLabel,
  getCopilotLinkKind,
  getCopilotTypingLabel,
  getOpenCopilotIssues,
  getOpenReviewActions,
  getReviewCardSourceMessageId,
  getTryAgainPrompt,
  loadTryAgainPrompt,
  orderStoppedTurns,
  readCopilotIssueRows,
} from './copilot-web-chat-utils';

function userMessage(id: string, text: string): AgentMessage {
  return {
    id,
    role: 'user',
    parts: [{ type: 'text', text, state: 'done' }],
    createdAt: '2026-11-05T00:00:00.000Z',
    status: 'sent',
  };
}

function assistantMessage(id: string, text: string): AgentMessage {
  return {
    id,
    role: 'assistant',
    parts: [{ type: 'text', text, state: 'done' }],
    createdAt: '2026-11-05T00:00:00.000Z',
    status: 'sent',
  };
}

function cardMessage(id: string): AgentMessage {
  return {
    id,
    role: 'assistant',
    parts: [{ type: 'card', card: { type: 'card', children: [] }, sourceMessageId: id }],
    createdAt: '2026-11-05T00:00:00.000Z',
    status: 'sent',
  };
}

function cardMessageWith(id: string, children: AgentCardChild[]): AgentMessage {
  return {
    ...cardMessage(id),
    parts: [{ type: 'card', card: { type: 'card', children }, sourceMessageId: id }],
  };
}

function reviewButton(
  actionId: CopilotReviewActionEnum,
  disabled?: boolean
): Extract<AgentCardChild, { type: 'button' }> {
  return { type: 'button', id: actionId, label: actionId, value: 'snapshot_1', disabled };
}

function reviewCardMessage(id: string): AgentMessage {
  return cardMessageWith(id, [
    {
      type: 'actions',
      children: [
        reviewButton(CopilotReviewActionEnum.KEEP),
        reviewButton(CopilotReviewActionEnum.REVERT),
        reviewButton(CopilotReviewActionEnum.TRY_AGAIN),
      ],
    },
  ]);
}

function noteCardMessage(id: string): AgentMessage {
  return cardMessageWith(id, [{ type: 'text', content: 'Kept the changes.', style: 'muted' }]);
}

const KEEP = CopilotReviewActionEnum.KEEP;
const REVERT = CopilotReviewActionEnum.REVERT;
const TRY_AGAIN = CopilotReviewActionEnum.TRY_AGAIN;

function reviewAction(sourceMessageId: string, actionId: CopilotReviewActionEnum) {
  return { actionId, sourceMessageId, value: 'snapshot_1' };
}

describe('getOpenReviewActions', () => {
  it('finds nothing in an empty thread or one without a card', () => {
    expect(getOpenReviewActions([])).toEqual({});
    expect(getOpenReviewActions([userMessage('msg_1', 'Hi'), assistantMessage('act_1', 'Hello')])).toEqual({});
  });

  it('builds the clicks the newest card sends, with each button value', () => {
    expect(getOpenReviewActions([userMessage('msg_1', 'Add SMS'), reviewCardMessage('card_review')])).toEqual({
      keep: reviewAction('card_review', KEEP),
      revert: reviewAction('card_review', REVERT),
    });
  });

  it('offers neither action on a card that only offers Try again', () => {
    const tryAgainOnly = cardMessageWith('card_try_again', [{ type: 'actions', children: [reviewButton(TRY_AGAIN)] }]);

    expect(getOpenReviewActions([userMessage('msg_1', 'Add SMS'), tryAgainOnly])).toEqual({});
  });

  it('offers only Keep on a card that only offers Keep', () => {
    const keepOnly = cardMessageWith('card_keep', [reviewButton(KEEP)]);

    expect(getOpenReviewActions([keepOnly])).toEqual({ keep: reviewAction('card_keep', KEEP) });
  });
});

describe('getOpenReviewActions (cards without review buttons)', () => {
  it('returns nothing for a card that has no review buttons', () => {
    expect(getOpenReviewActions([userMessage('msg_1', 'Add SMS'), noteCardMessage('card_note')])).toEqual({});
  });
});

describe('getOpenReviewActions (click state)', () => {
  const messages = [userMessage('msg_1', 'Add SMS'), reviewCardMessage('card_review')];

  it('returns nothing while a click on that card is waiting for the agent', () => {
    expect(getOpenReviewActions(messages, 'card_review')).toEqual({});
  });

  it('ignores a pending click that belongs to another card', () => {
    expect(getOpenReviewActions(messages, 'card_older').keep?.sourceMessageId).toBe('card_review');
  });

  it('returns nothing once the answer card, which has no review buttons, is the newest card', () => {
    expect(getOpenReviewActions([...messages, noteCardMessage('card_note')])).toEqual({});
  });

  it("keeps the review buttons open under a later answer's next steps", () => {
    const nextSteps = cardMessageWith('card_next_steps', [
      {
        type: 'actions',
        children: [
          { type: 'button', id: COPILOT_ASK_ACTION_ID, label: 'Test it', value: 'Test the workflow' },
          { type: 'link-button', label: 'Open Activity', url: 'https://dashboard.novu.co/env/e1/activity' },
        ],
      },
    ]);

    const thread = [...messages, userMessage('msg_2', 'Why?'), nextSteps];

    expect(getOpenReviewActions(thread).keep).toEqual(reviewAction('card_review', KEEP));
    expect(getReviewCardSourceMessageId(thread)).toBe('card_review');
  });

  it('offers a card again after the agent only answered in plain text', () => {
    expect(
      getOpenReviewActions([...messages, assistantMessage('act_failed_revert', "Couldn't revert")]).revert
    ).toEqual(reviewAction('card_review', REVERT));
  });

  it('returns the newest review card when an older one was already answered', () => {
    const actions = getOpenReviewActions([
      ...messages,
      noteCardMessage('card_note'),
      userMessage('msg_2', 'Add email'),
      reviewCardMessage('card_review_2'),
    ]);

    expect(actions.keep?.sourceMessageId).toBe('card_review_2');
    expect(actions.revert?.sourceMessageId).toBe('card_review_2');
  });
});

describe('getOpenReviewActions (button shapes)', () => {
  it('finds review buttons nested in a section or posted as bare buttons', () => {
    const section: AgentCardChild = { type: 'section', children: [reviewButton(KEEP)] };

    expect(getOpenReviewActions([cardMessageWith('card_section', [section])])).toEqual({
      keep: reviewAction('card_section', KEEP),
    });
    expect(getOpenReviewActions([cardMessageWith('card_bare', [reviewButton(REVERT)])])).toEqual({
      revert: reviewAction('card_bare', REVERT),
    });
  });

  it('returns nothing when every review button is disabled', () => {
    const disabled: AgentCardChild = {
      type: 'actions',
      children: [reviewButton(KEEP, true), reviewButton(REVERT, true)],
    };

    expect(getOpenReviewActions([cardMessageWith('card_disabled', [disabled])])).toEqual({});
  });

  it('ignores buttons that are not review actions', () => {
    const other: AgentCardChild = { type: 'actions', children: [{ type: 'button', id: 'open', label: 'Open' }] };

    expect(getOpenReviewActions([cardMessageWith('card_other', [other])])).toEqual({});
  });
});

describe('getTryAgainPrompt', () => {
  // The user stopped the first turn and sent another message before the stopped turn's review card arrived.
  const messages = [
    userMessage('msg_first', 'Add an SMS step'),
    assistantMessage('act_partial', 'Adding the SMS'),
    userMessage('msg_second', 'Make it high severity'),
    cardMessage('card_review'),
  ];

  it('resends the prompt the ready event names, not the last one before the card', () => {
    expect(
      getTryAgainPrompt(messages, { sourceMessageId: 'card_review', promptMessageId: 'msg_first' }, 'card_review')
    ).toBe('Add an SMS step');
  });

  it('falls back to the last user message before the card when the event names none', () => {
    expect(getTryAgainPrompt(messages, { sourceMessageId: 'card_review' }, 'card_review')).toBe(
      'Make it high severity'
    );
    expect(getTryAgainPrompt(messages, undefined, 'card_review')).toBe('Make it high severity');
  });

  it('falls back when the named message is not loaded', () => {
    expect(getTryAgainPrompt(messages, { promptMessageId: 'msg_paged_out' }, 'card_review')).toBe(
      'Make it high severity'
    );
  });

  it('ignores an assistant message with the named id', () => {
    expect(getTryAgainPrompt(messages, { promptMessageId: 'act_partial' }, 'card_review')).toBe(
      'Make it high severity'
    );
  });
});

describe('loadTryAgainPrompt', () => {
  const newestPage = [userMessage('msg_second', 'Make it high severity'), cardMessage('card_review')];
  const fullHistory = [userMessage('msg_first', 'Add an SMS step'), ...newestPage];

  it('loads older history until the named prompt is in it', async () => {
    const fetchMore = vi.fn().mockResolvedValue({ data: { messages: fullHistory, hasMore: false } });

    const prompt = await loadTryAgainPrompt({
      messages: newestPage,
      hasMore: true,
      fetchMore,
      readyEventData: { promptMessageId: 'msg_first' },
      cardSourceMessageId: 'card_review',
    });

    expect(prompt).toBe('Add an SMS step');
    expect(fetchMore).toHaveBeenCalledOnce();
  });

  it('loads nothing when the named prompt is already loaded or none is named', async () => {
    const fetchMore = vi.fn();

    await loadTryAgainPrompt({
      messages: fullHistory,
      hasMore: true,
      fetchMore,
      readyEventData: { promptMessageId: 'msg_first' },
      cardSourceMessageId: 'card_review',
    });
    const fallback = await loadTryAgainPrompt({
      messages: newestPage,
      hasMore: true,
      fetchMore,
      readyEventData: undefined,
      cardSourceMessageId: 'card_review',
    });

    expect(fallback).toBe('Make it high severity');
    expect(fetchMore).not.toHaveBeenCalled();
  });

  it('stops loading when older history fails to load', async () => {
    const fetchMore = vi.fn().mockResolvedValue({ error: new Error('offline') });

    const prompt = await loadTryAgainPrompt({
      messages: newestPage,
      hasMore: true,
      fetchMore,
      readyEventData: { promptMessageId: 'msg_first' },
      cardSourceMessageId: 'card_review',
    });

    expect(prompt).toBe('Make it high severity');
    expect(fetchMore).toHaveBeenCalledOnce();
  });
});

const POWERED_BY_FOOTER =
  '_Powered by [Novu](https://go.novu.co/agent-powered?utm_source=agent-powered&utm_medium=web-chat)_';

describe('buildAssistantBlocks (Powered by footer)', () => {
  it('strips the footer the API appends to a reply', () => {
    const blocks = buildAssistantBlocks(assistantMessage('act_1', `Added an SMS step.\n\n${POWERED_BY_FOOTER}`));

    expect(blocks).toEqual([{ kind: 'text', key: 'act_1:0', text: 'Added an SMS step.', streaming: false }]);
  });

  it('strips the linkless footer', () => {
    const blocks = buildAssistantBlocks(assistantMessage('act_1', 'Added an SMS step.\n\nPowered by Novu​'));

    expect(blocks).toEqual([{ kind: 'text', key: 'act_1:0', text: 'Added an SMS step.', streaming: false }]);
  });

  it('drops a text part that is only the footer', () => {
    expect(buildAssistantBlocks(assistantMessage('act_1', POWERED_BY_FOOTER))).toEqual([]);
  });

  it('keeps a reply that only mentions Novu mid-text', () => {
    const text = 'Powered by Novu workflows, this step sends an SMS.';

    expect(buildAssistantBlocks(assistantMessage('act_1', text))).toEqual([
      { kind: 'text', key: 'act_1:0', text, streaming: false },
    ]);
  });
});

describe('buildAssistantBlocks (answer tools)', () => {
  it('drops the calls that only put buttons under the reply, and keeps the tools around them in one group', () => {
    const toolPart = (toolUseId: string, toolName: string) =>
      ({ type: 'tool', toolUseId, toolName, input: {}, state: 'output-available' }) as const;
    const message: AgentMessage = {
      ...assistantMessage('act_1', ''),
      parts: [
        toolPart('t1', 'get_workflow_runs'),
        toolPart('t2', CopilotAnswerToolEnum.SHOW_NEXT_STEPS),
        toolPart('t3', `novu__${CopilotAnswerToolEnum.REPORT_WORKFLOW_ISSUES}`),
        toolPart('t4', 'get_workflow_run'),
      ],
    };

    const blocks = buildAssistantBlocks(message);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind === 'tools' && blocks[0].rows.map((row) => row.id)).toEqual(['t1', 't4']);
  });
});

function issueSection(title: string, fix: string, step?: { stepId: string; name: string }): AgentCardChild {
  return {
    type: 'section',
    children: [
      ...(step
        ? [{ type: 'fields' as const, children: [{ type: 'field' as const, label: 'Step', value: step.name }] }]
        : []),
      { type: 'text', content: title },
      {
        type: 'actions',
        children: [{ type: 'button', id: buildCopilotFixActionId(step?.stepId), label: 'Fix', value: fix }],
      },
    ],
  };
}

const EMAIL_STEP = { stepId: 'email-step', name: 'Email Step' };
const INBOX_STEP = { stepId: 'in-app', name: 'Inbox' };

describe('readCopilotIssueRows', () => {
  it('reads one row per section that holds a Fix button', () => {
    const card = {
      type: 'card' as const,
      title: '3 issues',
      children: [
        issueSection('Placeholder subject', 'Write a real subject', EMAIL_STEP),
        issueSection('No description', 'Add a description'),
        { type: 'section' as const, children: [{ type: 'text' as const, content: 'Not an issue' }] },
        { type: 'actions' as const, children: [reviewButton(KEEP)] },
      ],
    };

    expect(readCopilotIssueRows(card)).toEqual([
      { stepId: 'email-step', stepName: 'Email Step', title: 'Placeholder subject', fix: 'Write a real subject' },
      { stepName: undefined, title: 'No description', fix: 'Add a description' },
    ]);
  });
});

describe('getOpenCopilotIssues', () => {
  const review = cardMessageWith('card_review_issues', [
    issueSection('Placeholder subject', 'Write a real subject', EMAIL_STEP),
    issueSection('Hardcoded URL', 'Take the URL from the payload', INBOX_STEP),
    issueSection('No condition', 'Only send the email if the in-app message was not seen', EMAIL_STEP),
  ]);

  it('counts the open issues of the newest review by step', () => {
    const issues = getOpenCopilotIssues([userMessage('msg_1', 'Audit this workflow'), review]);

    expect(countCopilotIssuesByStep(issues)).toEqual([
      ['email-step', 2],
      ['in-app', 1],
    ]);
  });

  it('closes an issue once its fix was sent, as a Fix click sends it', () => {
    const issues = getOpenCopilotIssues([
      review,
      userMessage('msg_2', 'Write a real subject'),
      assistantMessage('act_2', 'Done.'),
    ]);

    expect(issues.map((issue) => issue.title)).toEqual(['Hardcoded URL', 'No condition']);
  });

  it('reads the newest review only, and nothing without one', () => {
    const newer = cardMessageWith('card_review_2', [issueSection('Empty body', 'Write the body', INBOX_STEP)]);

    expect(getOpenCopilotIssues([review, userMessage('msg_2', 'Audit it again'), newer])).toHaveLength(1);
    expect(getOpenCopilotIssues([userMessage('msg_1', 'Hi'), reviewCardMessage('card_review')])).toEqual([]);
  });
});

/** The empty message `@novu/js` adds to carry the mark of a run stopped before its reply reached the timeline. */
function stoppedPlaceholder(runId: string): AgentMessage {
  return { ...assistantMessage(`${runId}_stopped`, ''), parts: [], stopped: true };
}

function stoppedReply(id: string, text: string): AgentMessage {
  return { ...assistantMessage(id, text), stopped: true };
}

function stoppedToolMessage(id: string): AgentMessage {
  return {
    ...assistantMessage(id, ''),
    parts: [
      {
        type: 'tool',
        toolUseId: 'tool_1',
        toolName: 'addStep',
        input: { step: { stepId: 'sms-step', type: 'sms' } },
        state: 'output-available',
      },
    ],
    stopped: true,
  };
}

function summarize(messages: readonly AgentMessage[]) {
  return messages.map((message) => [message.id, !!message.stopped]);
}

describe('orderStoppedTurns', () => {
  it('leaves a thread without a stopped turn as it is', () => {
    const messages = [
      userMessage('msg_1', 'Add SMS'),
      assistantMessage('act_1', 'Added an SMS step.'),
      reviewCardMessage('card_review'),
    ];

    expect(orderStoppedTurns(messages)).toEqual(messages);
  });

  it('puts the late reply, then "Stopped", above the card a stopped run saved first', () => {
    const late = assistantMessage('act_1', `I'm adding the SMS st\n\n${POWERED_BY_FOOTER}`);
    const ordered = orderStoppedTurns([
      userMessage('msg_1', 'Add SMS'),
      stoppedPlaceholder('run_1'),
      reviewCardMessage('card_review'),
      late,
    ]);

    expect(summarize(ordered)).toEqual([
      ['msg_1', false],
      ['act_1', true],
      ['card_review', false],
    ]);
    expect(ordered[1].parts).toEqual(late.parts);
  });

  it('moves the mark off a partial reply onto the reply that continued it after the card', () => {
    const ordered = orderStoppedTurns([
      userMessage('msg_1', 'Add SMS'),
      stoppedReply('act_1', "I'll add the steps"),
      reviewCardMessage('card_review'),
      assistantMessage('act_2', 'Done, I added'),
    ]);

    expect(summarize(ordered)).toEqual([
      ['msg_1', false],
      ['act_1', false],
      ['act_2', true],
      ['card_review', false],
    ]);
  });

  it('keeps the tools of the stopped run above the late reply', () => {
    const ordered = orderStoppedTurns([
      userMessage('msg_1', 'Add SMS'),
      stoppedToolMessage('run_1'),
      reviewCardMessage('card_review'),
      assistantMessage('act_1', 'Added the SMS step'),
    ]);

    expect(summarize(ordered)).toEqual([
      ['msg_1', false],
      ['run_1', false],
      ['act_1', true],
      ['card_review', false],
    ]);
  });

  it('moves the late reply above every card saved before it', () => {
    const ordered = orderStoppedTurns([
      stoppedPlaceholder('run_1'),
      reviewCardMessage('card_review'),
      noteCardMessage('card_note'),
      assistantMessage('act_1', 'Partial reply'),
    ]);

    expect(summarize(ordered)).toEqual([
      ['act_1', true],
      ['card_review', false],
      ['card_note', false],
    ]);
  });

  it('leaves a turn whose late reply took the mark before the card arrived', () => {
    const messages = [
      userMessage('msg_1', 'Add SMS'),
      stoppedReply('act_1', 'Partial reply'),
      reviewCardMessage('card_review'),
    ];

    expect(orderStoppedTurns(messages)).toEqual(messages);
  });

  it('does not pull a reply up from the next turn', () => {
    const messages = [
      userMessage('msg_1', 'Add SMS'),
      stoppedPlaceholder('run_1'),
      reviewCardMessage('card_review'),
      userMessage('msg_2', 'Make it high severity'),
      assistantMessage('act_2', 'Done'),
    ];

    expect(orderStoppedTurns(messages)).toEqual(messages);
  });

  it('does not move a reply that shows nothing but the footer', () => {
    const messages = [
      stoppedPlaceholder('run_1'),
      reviewCardMessage('card_review'),
      assistantMessage('act_1', POWERED_BY_FOOTER),
    ];

    expect(orderStoppedTurns(messages)).toEqual(messages);
  });

  it('reorders only the stopped turn of a longer thread', () => {
    const ordered = orderStoppedTurns([
      userMessage('msg_1', 'Add SMS'),
      assistantMessage('act_1', 'Added an SMS step.'),
      reviewCardMessage('card_review_1'),
      noteCardMessage('card_note'),
      userMessage('msg_2', 'Add email'),
      stoppedPlaceholder('run_2'),
      reviewCardMessage('card_review_2'),
      assistantMessage('act_2', 'Adding the em'),
      userMessage('msg_3', 'Never mind'),
      assistantMessage('act_3', 'Okay.'),
    ]);

    expect(summarize(ordered)).toEqual([
      ['msg_1', false],
      ['act_1', false],
      ['card_review_1', false],
      ['card_note', false],
      ['msg_2', false],
      ['act_2', true],
      ['card_review_2', false],
      ['msg_3', false],
      ['act_3', false],
    ]);
  });
});

describe('getCopilotTypingLabel', () => {
  it.each([[undefined], [''], ['  '], ['Thinking...'], ['Thinking…'], ['thinking...']])(
    'falls back to the Copilot label for the platform default %j',
    (status) => {
      expect(getCopilotTypingLabel(status)).toBeUndefined();
    }
  );

  it.each([
    ['Adding In-App Step…', 'Adding In-App Step…'],
    ['Writing step content…', 'Writing step content…'],
    ['Thinking about the email step…', 'Thinking about the email step…'],
  ])('keeps the agent status %j', (status, expected) => {
    expect(getCopilotTypingLabel(status)).toBe(expected);
  });
});

describe('buildCopilotMetadata', () => {
  it('sends the environment, workflow and step from the workflow editor', () => {
    expect(
      buildCopilotMetadata(
        { workflowId: 'wf_1', stepId: 'step_1', workflowLabel: 'Welcome', stepLabel: 'Email' },
        'env_1'
      )
    ).toEqual({ environmentId: 'env_1', workflowId: 'wf_1', stepId: 'step_1' });
  });

  it('sends the page and what it shows, but not its local question', () => {
    const viewing = {
      resource: { type: CopilotViewingResourceEnum.WORKFLOW_RUN, id: 'run_1', label: 'Welcome' },
      filters: { channels: ['email', 'sms'] },
    };

    expect(
      buildCopilotMetadata({ page: CopilotPageEnum.ACTIVITY, viewing, question: 'Explain this run' }, 'env_1')
    ).toEqual({ environmentId: 'env_1', page: CopilotPageEnum.ACTIVITY, viewing: JSON.stringify(viewing) });
  });

  it('leaves out what is not set', () => {
    expect(buildCopilotMetadata({ page: CopilotPageEnum.ACTIVITY }, undefined)).toEqual({
      page: CopilotPageEnum.ACTIVITY,
    });
    expect(buildCopilotMetadata(undefined, undefined)).toEqual({});
  });
});

describe('getCopilotContextLabel', () => {
  it('joins the workflow and step labels in the workflow editor', () => {
    expect(getCopilotContextLabel({ workflowLabel: 'Welcome', stepLabel: 'Email' })).toBe('Welcome / Email');
    expect(getCopilotContextLabel({ workflowLabel: 'Welcome' })).toBe('Welcome');
  });

  it('shows the open resource on a page, and nothing without one', () => {
    expect(
      getCopilotContextLabel({
        page: CopilotPageEnum.ACTIVITY,
        viewing: { resource: { type: CopilotViewingResourceEnum.REQUEST, id: 'req_1', label: 'POST /v1/events' } },
      })
    ).toBe('POST /v1/events');
    expect(
      getCopilotContextLabel({ page: CopilotPageEnum.ACTIVITY, viewing: { filters: { workflows: 'welcome' } } })
    ).toBe('');
  });
});

describe('getCopilotLinkKind', () => {
  const origin = 'https://dashboard.novu.co';

  it('opens links on the dashboard origin in place', () => {
    expect(getCopilotLinkKind(`${origin}/env/dev_env_1/activity/workflow-runs?activityItemId=run_1`, origin)).toBe(
      'dashboard'
    );
    expect(getCopilotLinkKind('/env/dev_env_1/activity/requests', origin)).toBe('dashboard');
  });

  it('asks before opening another site', () => {
    expect(getCopilotLinkKind('https://docs.novu.co/platform', origin)).toBe('external');
    expect(getCopilotLinkKind('https://dashboard.novu.co.evil.com/env', origin)).toBe('external');
  });

  it('keeps mail, phone, script and broken links as plain text', () => {
    expect(getCopilotLinkKind('mailto:naveen@novu.co', origin)).toBe('text');
    expect(getCopilotLinkKind('tel:+15550100', origin)).toBe('text');
    expect(getCopilotLinkKind('javascript:alert(1)', origin)).toBe('text');
    expect(getCopilotLinkKind('streamdown:incomplete-link', origin)).toBe('text');
    expect(getCopilotLinkKind('http://[invalid', origin)).toBe('text');
    expect(getCopilotLinkKind(undefined, origin)).toBe('text');
  });
});
