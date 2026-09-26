import { BadRequestException } from '@nestjs/common';
import { HumanInteractionKindEnum } from '@novu/shared';
import { expect } from 'chai';
import { assertHumanCardActions } from './human-interaction-lifecycle';

describe('assertHumanCardActions', () => {
  function cardElement(buttons: Array<Record<string, unknown>>, extra: Record<string, unknown> = {}) {
    return {
      type: 'card' as const,
      title: 'Approve this?',
      children: [{ type: 'actions', children: buttons }],
      ...extra,
    };
  }

  it('accepts a posted card element whose buttons carry plain custom option ids', () => {
    const card = cardElement([
      { type: 'button', id: 'escalate', label: 'Escalate' },
      { type: 'button', id: 'snooze', label: 'Snooze' },
    ]);

    expect(() => assertHumanCardActions(HumanInteractionKindEnum.APPROVE, card)).to.not.throw();
  });

  it('accepts a posted approve card element whose buttons use the framework `human:*` grammar', () => {
    // The `{ render }` path mints `actionIds.approve`/`deny` as `human:<id>:approve`
    // — these are legitimate and must not be rejected during validation.
    const card = cardElement([
      { type: 'button', id: 'human:hi_abc123:approve', label: 'Yes' },
      { type: 'button', id: 'human:hi_abc123:deny', label: 'No' },
    ]);

    expect(() => assertHumanCardActions(HumanInteractionKindEnum.APPROVE, card)).to.not.throw();
  });

  it('does not let a top-level empty `extraActions: []` hide invalid card-element buttons', () => {
    // The empty array must not nullish-coalesce over the parsed buttons —
    // otherwise a button with a blank label would skip validation entirely.
    const card = cardElement([{ type: 'button', id: 'do-thing', label: '' }], { extraActions: [] });

    expect(() => assertHumanCardActions(HumanInteractionKindEnum.APPROVE, card)).to.throw(BadRequestException);
  });

  it('still validates chrome extraActions (reserved ids rejected)', () => {
    const chrome = { title: 'Approve this?', extraActions: [{ id: 'approve', label: 'Yes' }] };

    expect(() => assertHumanCardActions(HumanInteractionKindEnum.APPROVE, chrome)).to.throw(BadRequestException);
  });
});
