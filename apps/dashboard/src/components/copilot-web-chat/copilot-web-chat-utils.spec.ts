import type { AgentCardChild, AgentMessage } from '@novu/js';
import { CopilotReviewActionEnum } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import { getOpenReviewCard, getTryAgainPrompt } from './copilot-web-chat-utils';

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

function reviewButton(actionId: CopilotReviewActionEnum, disabled?: boolean): AgentCardChild {
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

describe('getOpenReviewCard', () => {
  it('finds nothing in an empty thread or one without a card', () => {
    expect(getOpenReviewCard([])).toBeUndefined();
    expect(getOpenReviewCard([userMessage('msg_1', 'Hi'), assistantMessage('act_1', 'Hello')])).toBeUndefined();
  });

  it('returns the newest card when it offers the review buttons', () => {
    expect(getOpenReviewCard([userMessage('msg_1', 'Add SMS'), reviewCardMessage('card_review')])).toBe('card_review');
  });
});

describe('getOpenReviewCard (cards without review buttons)', () => {
  it('returns nothing for a card that has no review buttons', () => {
    expect(getOpenReviewCard([userMessage('msg_1', 'Add SMS'), noteCardMessage('card_note')])).toBeUndefined();
  });
});

describe('getOpenReviewCard (click state)', () => {
  const messages = [userMessage('msg_1', 'Add SMS'), reviewCardMessage('card_review')];

  it('returns nothing while a click on that card is waiting for the agent', () => {
    expect(getOpenReviewCard(messages, 'card_review')).toBeUndefined();
  });

  it('ignores a pending click that belongs to another card', () => {
    expect(getOpenReviewCard(messages, 'card_older')).toBe('card_review');
  });

  it('returns nothing once the answer card, which has no review buttons, is the newest card', () => {
    expect(getOpenReviewCard([...messages, noteCardMessage('card_note')])).toBeUndefined();
  });

  it('offers a card again after the agent only answered in plain text', () => {
    expect(getOpenReviewCard([...messages, assistantMessage('act_failed_revert', "Couldn't revert")])).toBe(
      'card_review'
    );
  });

  it('returns the newest review card when an older one was already answered', () => {
    expect(
      getOpenReviewCard([
        ...messages,
        noteCardMessage('card_note'),
        userMessage('msg_2', 'Add email'),
        reviewCardMessage('card_review_2'),
      ])
    ).toBe('card_review_2');
  });
});

describe('getOpenReviewCard (button shapes)', () => {
  it('finds review buttons nested in a section or posted as bare buttons', () => {
    const section: AgentCardChild = { type: 'section', children: [reviewButton(CopilotReviewActionEnum.KEEP)] };

    expect(getOpenReviewCard([cardMessageWith('card_section', [section])])).toBe('card_section');
    expect(getOpenReviewCard([cardMessageWith('card_bare', [reviewButton(CopilotReviewActionEnum.REVERT)])])).toBe(
      'card_bare'
    );
  });

  it('returns nothing when every review button is disabled', () => {
    const disabled: AgentCardChild = {
      type: 'actions',
      children: [reviewButton(CopilotReviewActionEnum.KEEP, true), reviewButton(CopilotReviewActionEnum.REVERT, true)],
    };

    expect(getOpenReviewCard([cardMessageWith('card_disabled', [disabled])])).toBeUndefined();
  });

  it('ignores buttons that are not review actions', () => {
    const other: AgentCardChild = { type: 'actions', children: [{ type: 'button', id: 'open', label: 'Open' }] };

    expect(getOpenReviewCard([cardMessageWith('card_other', [other])])).toBeUndefined();
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
