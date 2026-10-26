import { BadGatewayException, BadRequestException, GatewayTimeoutException } from '@nestjs/common';
import { HumanInteractionKindEnum, VoiceCallFailureCodeEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { unconfirmedVoiceDialBody } from '../../agents/channels/voice/voice-call-failure';
import { assertHumanCardActions, deliverToTargets } from './human-interaction-lifecycle';

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

describe('deliverToTargets', () => {
  it('rethrows a coded voice failure instead of wrapping it as a generic gateway error', async () => {
    const repository = { delete: sinon.stub().resolves(undefined) };
    const logger = { warn: sinon.stub() };

    try {
      await deliverToTargets(
        repository as never,
        logger as never,
        { _id: '1', _environmentId: 'env1', identifier: 'hi_1' } as never,
        [
          {
            subscriberId: 'sub-1',
            integrationIdentifier: 'voice-main',
            platform: 'voice',
            deliver: async () => {
              throw new BadGatewayException({
                code: VoiceCallFailureCodeEnum.INVALID_NUMBER,
                message: 'That phone number is not valid.',
              });
            },
          },
        ],
        { logMessage: 'failed' }
      );
      expect.fail('expected the coded failure');
    } catch (err) {
      expect(err).to.be.instanceOf(BadGatewayException);
      expect((err as BadGatewayException).getResponse()).to.include({
        code: VoiceCallFailureCodeEnum.INVALID_NUMBER,
      });
    }

    expect(repository.delete.calledOnce).to.equal(true);
  });

  it('keeps the row when the dial is not confirmed', async () => {
    const repository = { delete: sinon.stub().resolves(undefined) };
    const logger = { warn: sinon.stub() };

    try {
      await deliverToTargets(
        repository as never,
        logger as never,
        { _id: '1', _environmentId: 'env1', identifier: 'hi_1' } as never,
        [
          {
            subscriberId: 'sub-1',
            integrationIdentifier: 'voice-main',
            platform: 'voice',
            deliver: async () => {
              throw new GatewayTimeoutException(unconfirmedVoiceDialBody());
            },
          },
        ],
        { logMessage: 'failed' }
      );
      expect.fail('expected the unconfirmed dial');
    } catch (err) {
      expect(err).to.be.instanceOf(GatewayTimeoutException);
      expect((err as GatewayTimeoutException).getResponse()).to.include({ code: 'voice_dial_unconfirmed' });
    }

    expect(repository.delete.called).to.equal(false);
  });

  it('stamps each delivery before dialing the next recipient', async () => {
    const order: string[] = [];
    const repository = {
      stampDelivery: sinon.stub().callsFake(async () => {
        order.push('stamp');
      }),
    };
    const logger = { warn: sinon.stub() };

    await deliverToTargets(
      repository as never,
      logger as never,
      { _id: '1', _environmentId: 'env1', identifier: 'hi_1' } as never,
      [
        {
          subscriberId: 'sub-1',
          integrationIdentifier: 'voice-main',
          platform: 'voice',
          deliver: async () => {
            order.push('first');

            return { platformMessageId: 'conv_1', platformThreadId: 'conv_1' };
          },
        },
        {
          subscriberId: 'sub-2',
          integrationIdentifier: 'voice-main',
          platform: 'voice',
          deliver: async () => {
            order.push('second');

            return { platformMessageId: 'conv_2', platformThreadId: 'conv_2' };
          },
        },
      ],
      { logMessage: 'failed' }
    );

    expect(order).to.deep.equal(['first', 'stamp', 'second', 'stamp']);
    expect(repository.stampDelivery.firstCall.args[2].deliveries).to.have.length(1);
    expect(repository.stampDelivery.secondCall.args[2].deliveries).to.have.length(2);
  });
});
