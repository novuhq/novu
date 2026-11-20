import { BadRequestException } from '@nestjs/common';
import type { HumanInteractionEntity } from '@novu/dal';
import { HumanChannelViaEnum, HumanInteractionKindEnum, HumanInteractionStatusEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { buildPendingContent } from '../../agents/human-relay/human-card.builder';
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

describe('countHumanCardButtons and the card builder', () => {
  function builtButtons(node: unknown): number {
    if (Array.isArray(node)) {
      return node.reduce((sum: number, item) => sum + builtButtons(item), 0);
    }
    if (!node || typeof node !== 'object') {
      return 0;
    }
    const { type, children } = node as { type?: string; children?: unknown };

    return type === 'button' ? 1 : builtButtons(children);
  }

  // The count is worked out before the card exists, so this holds it to what the builder really lays out.
  it('agree on how many buttons a card has', () => {
    const cards = [
      { kind: HumanInteractionKindEnum.APPROVE, card: { title: 'Deploy?' } },
      {
        kind: HumanInteractionKindEnum.APPROVE,
        card: { title: 'Deploy?', extraActions: [{ id: 'later', label: 'Later' }] },
      },
      {
        kind: HumanInteractionKindEnum.CHOOSE,
        card: {
          title: 'Which?',
          options: [
            { id: 'a', label: 'A' },
            { id: 'b', label: 'B' },
            { id: 'c', label: 'C' },
          ],
        },
      },
      { kind: HumanInteractionKindEnum.ASK, card: { title: 'Why?' } },
    ];

    for (const { kind, card } of cards) {
      const built = buildPendingContent({
        _id: 'id1',
        identifier: 'hi_1',
        kind,
        status: HumanInteractionStatusEnum.PENDING,
        content: { cardChrome: card },
        subscriberIds: ['sub-1'],
        _agentId: 'agent1',
        expiresAt: new Date().toISOString(),
        _environmentId: 'env1',
        _organizationId: 'org1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as HumanInteractionEntity);

      expect(builtButtons(built.card), `${kind} with ${JSON.stringify(card)}`).to.equal(
        countHumanCardButtons(kind, card)
      );
    }
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

  it('keeps a plain message waiting while it is still held for someone, and never saves the hold a second time', async () => {
    const repository = {
      stampDelivery: sinon.stub().resolves(),
      keepTellPendingWhileHeld: sinon.stub().resolves(),
      markDeliveredIfPending: sinon.stub().resolves(null),
      addHold: sinon.stub().resolves(),
    };
    const held = (subscriberId: string) => ({
      subscriberId,
      integrationIdentifier: 'wa',
      platform: 'whatsapp',
      deliver: async () => ({
        platformMessageId: `wamid.${subscriberId}`,
        platformThreadId: 'whatsapp:1:2',
        held: true,
      }),
    });

    const { interaction } = await deliverToTargets(
      repository as never,
      { warn: sinon.stub() } as never,
      {
        _id: 'hi1',
        _environmentId: 'env1',
        identifier: 'hi_1',
        kind: HumanInteractionKindEnum.TELL,
        subscriberIds: ['ada', 'bob'],
      } as never,
      [held('ada'), held('bob')],
      { logMessage: 'failed' }
    );

    expect(repository.keepTellPendingWhileHeld.calledOnceWith('env1', 'hi1')).to.equal(true);
    expect(repository.markDeliveredIfPending.called).to.equal(false);
    // The send itself saves each hold before its first message goes out.
    expect(repository.addHold.called).to.equal(false);
    expect(interaction.held?.map((hold) => hold.subscriberId)).to.deep.equal(['ada', 'bob']);
  });
});
