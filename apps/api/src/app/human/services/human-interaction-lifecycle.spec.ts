import { BadRequestException } from '@nestjs/common';
import { HumanChannelViaEnum, HumanInteractionKindEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { assertHumanCardActions, countHumanCardButtons, deliverToTargets } from './human-interaction-lifecycle';
import { WhatsAppUndeliverableException } from './whatsapp-delivery.errors';

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

describe('countHumanCardButtons', () => {
  it('counts the buttons each kind of card shows', () => {
    expect(countHumanCardButtons(HumanInteractionKindEnum.APPROVE, { title: 'Deploy?' })).to.equal(2);
    expect(
      countHumanCardButtons(HumanInteractionKindEnum.APPROVE, {
        title: 'Deploy?',
        extraActions: [{ id: 'later', label: 'Later' }],
      })
    ).to.equal(3);
    expect(
      countHumanCardButtons(HumanInteractionKindEnum.CHOOSE, { title: 'Which?', options: ['a', 'b', 'c', 'd'] })
    ).to.equal(4);
    expect(countHumanCardButtons(HumanInteractionKindEnum.ASK, { title: 'Why?' })).to.equal(0);
    expect(countHumanCardButtons(HumanInteractionKindEnum.TELL, { title: 'Done' })).to.equal(0);
  });

  it('counts every button of a posted card', () => {
    const card = {
      type: 'card' as const,
      children: [
        {
          type: 'actions',
          children: [
            { type: 'button', id: 'human:hi_1:approve', label: 'Yes' },
            { type: 'button', id: 'human:hi_1:deny', label: 'No' },
            { type: 'button', id: 'snooze', label: 'Snooze' },
            { type: 'button', id: 'escalate', label: 'Escalate' },
          ],
        },
      ],
    };

    expect(countHumanCardButtons(HumanInteractionKindEnum.APPROVE, card)).to.equal(4);
  });
});

describe('deliverToTargets', () => {
  it('passes a WhatsApp refusal through as it is, never as a delivery failure', async () => {
    const refusal = new WhatsAppUndeliverableException('ada', { reason: 'whatsapp_window_closed' }, [
      HumanChannelViaEnum.TELEGRAM,
    ]);
    const repository = { delete: sinon.stub().resolves() };
    const logger = { warn: sinon.stub() };

    const error = await deliverToTargets(
      repository as never,
      logger as never,
      { _id: 'hi1', _environmentId: 'env1', identifier: 'hi_1' } as never,
      [
        {
          subscriberId: 'ada',
          integrationIdentifier: 'wa',
          platform: 'whatsapp',
          deliver: () => Promise.reject(refusal),
        },
      ],
      { logMessage: 'failed' }
    ).catch((err: unknown) => err);

    expect(error).to.equal(refusal);
    expect(repository.delete.calledOnce).to.equal(true);
  });
});
