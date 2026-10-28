import { BadRequestException } from '@nestjs/common';
import { HumanChannelViaEnum, HumanInteractionKindEnum, HumanInteractionStatusEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { VoiceTurn } from './voice-turn.usecase';

describe('VoiceTurn', () => {
  afterEach(() => {
    sinon.restore();
  });

  function setup(
    overrides: {
      kind?: HumanInteractionKindEnum;
      status?: HumanInteractionStatusEnum;
      handoff?: Record<string, unknown> | null;
      deliveryEnded?: boolean;
      nonVoice?: boolean;
    } = {}
  ) {
    const interaction = {
      _id: 'hi1',
      identifier: 'hi_1',
      kind: overrides.kind ?? HumanInteractionKindEnum.APPROVE,
      status: overrides.status ?? HumanInteractionStatusEnum.PENDING,
      content: {
        cardChrome: {
          title: 'Deploy?',
          options: [
            { id: 'canary', label: 'Canary' },
            { id: 'all', label: 'All at once' },
          ],
        },
      },
      subscriberIds: ['sub-1'],
      voiceSubscriberIds: overrides.nonVoice ? [] : ['sub-1'],
      deliveries: [
        overrides.nonVoice
          ? {
              subscriberId: 'sub-1',
              platform: HumanChannelViaEnum.EMAIL,
              platformMessageId: 'msg_1',
              platformThreadId: 'thread_1',
              integrationIdentifier: 'email',
            }
          : {
              subscriberId: 'sub-1',
              platform: HumanChannelViaEnum.VOICE,
              platformMessageId: 'conv_el_1',
              platformThreadId: 'CA_1',
              integrationIdentifier: 'voice',
              ...(overrides.deliveryEnded ? { voiceCallEnded: { reason: 'person_hangup' } } : {}),
            },
      ],
      _environmentId: 'env1',
      _organizationId: 'org1',
    };

    const humanInteractionRepository = {
      findByIdentifier: sinon.stub().resolves(interaction),
    };
    const subscriberRepository = {
      findBySubscriberId: sinon.stub().resolves({ subscriberId: 'sub-1', firstName: 'Ada' }),
    };
    const cacheService = {
      get: sinon.stub(),
      eval: sinon.stub(),
    };
    const recordVoiceCallEnded = {
      expireIfStale: sinon.stub().callsFake(async (row: typeof interaction) => row),
    };
    const settlement = {
      settle: sinon
        .stub()
        .callsFake(async (row: typeof interaction, status: HumanInteractionStatusEnum, response: unknown) => ({
          ...row,
          status,
          response,
        })),
      settleExpiredVoice: sinon.stub().resolves(null),
    };

    const handoff =
      overrides.handoff === null
        ? null
        : {
            environmentId: 'env1',
            organizationId: 'org1',
            interactionId: 'hi_1',
            subscriberId: 'sub-1',
            status: 'live',
            inboundSeq: 1,
            agentSeq: 0,
            utterances: ['yeah go ahead'],
            ...(overrides.handoff ?? {}),
          };

    if (handoff) {
      const stored = {
        environmentId: handoff.environmentId,
        organizationId: handoff.organizationId,
        interactionId: handoff.interactionId,
        subscriberId: handoff.subscriberId,
        status: handoff.status,
        inboundSeq: handoff.inboundSeq,
        agentSeq: handoff.agentSeq,
        utterancesJson: JSON.stringify(handoff.utterances),
      };
      cacheService.get.resolves(JSON.stringify(stored));
      cacheService.eval.callsFake(async (script: string) => {
        // POST_LINE_SCRIPT returns 1 when the call is live.
        if (script.includes('pendingAgentLine = ARGV[2]')) {
          return handoff.status === 'live' || handoff.status === 'dialing' ? 1 : 0;
        }
        // TAKE_UTTERANCES_SCRIPT hands over everything past agentSeq.
        if (script.includes('takenJson')) {
          const taken = (handoff.utterances as string[]).slice(Number(handoff.agentSeq) || 0);

          return JSON.stringify({
            handoffJson: JSON.stringify({ ...stored, agentSeq: handoff.inboundSeq }),
            takenJson: JSON.stringify(taken),
          });
        }

        return null;
      });
    } else {
      cacheService.get.resolves(null);
      cacheService.eval.resolves(null);
    }

    const usecase = new VoiceTurn(
      humanInteractionRepository as never,
      subscriberRepository as never,
      cacheService as never,
      recordVoiceCallEnded as never,
      settlement as never
    );

    return { usecase, settlement, cacheService, humanInteractionRepository, interaction };
  }

  const command = {
    environmentId: 'env1',
    organizationId: 'org1',
    userId: 'user1',
    identifier: 'hi_1',
  };

  it('settles an approve with decision and forces hangup', async () => {
    const { usecase, settlement, cacheService } = setup();

    const result = await usecase.execute({
      ...command,
      say: 'Got it, thanks.',
      answer: 'yeah go ahead',
      decision: 'approve',
    } as never);

    expect(result).to.deep.include({
      status: 'settled',
      interactionStatus: HumanInteractionStatusEnum.APPROVED,
      decision: 'approve',
      answer: 'yeah go ahead',
    });
    expect(settlement.settle.calledOnce).to.equal(true);
    expect(settlement.settle.firstCall.args[1]).to.equal(HumanInteractionStatusEnum.APPROVED);
    expect(settlement.settle.firstCall.args[2]).to.include({
      type: 'option',
      optionId: 'approve',
      text: 'yeah go ahead',
      respondedBy: 'Ada',
      respondedBySubscriberId: 'sub-1',
    });
    expect(cacheService.eval.firstCall.args[2][2]).to.equal('1');
  });

  it('settles even when the call already dropped', async () => {
    const { usecase, settlement } = setup({ handoff: null, deliveryEnded: true });

    const result = await usecase.execute({
      ...command,
      answer: 'yeah go ahead',
      decision: 'approve',
    } as never);

    expect(result.status).to.equal('settled');
    expect(settlement.settle.calledOnce).to.equal(true);
  });

  it('hangs up when settling without a spoken line', async () => {
    const { usecase, cacheService } = setup();

    await usecase.execute({
      ...command,
      answer: 'yeah go ahead',
      decision: 'approve',
    } as never);

    expect(cacheService.eval.firstCall.args[2][1]).to.equal('');
    expect(cacheService.eval.firstCall.args[2][2]).to.equal('1');
  });

  it('does not settle a text interaction from a voice turn', async () => {
    const { usecase, settlement } = setup({ nonVoice: true });

    try {
      await usecase.execute({
        ...command,
        answer: 'yeah go ahead',
        decision: 'approve',
      } as never);
      expect.fail('expected rejection');
    } catch (err) {
      expect(err).to.be.instanceOf(BadRequestException);
      expect((err as BadRequestException).message).to.match(/voice call/i);
    }

    expect(settlement.settle.called).to.equal(false);
  });

  it('records a voice answer after the call-end expiry', async () => {
    const { usecase, settlement } = setup({
      status: HumanInteractionStatusEnum.EXPIRED,
      handoff: null,
      deliveryEnded: true,
    });
    settlement.settle.resolves(null);
    settlement.settleExpiredVoice.callsFake(async (row: object, status: string, response: unknown) => ({
      ...row,
      status,
      response,
    }));

    const result = await usecase.execute({
      ...command,
      answer: 'yeah go ahead',
      decision: 'approve',
    } as never);

    expect(result.status).to.equal('settled');
    expect(result).to.deep.include({ decision: 'approve', answer: 'yeah go ahead' });
    expect(settlement.settle.calledOnce).to.equal(true);
    expect(settlement.settleExpiredVoice.calledOnce).to.equal(true);
  });

  it('rejects an approve settle without decision', async () => {
    const { usecase } = setup();

    try {
      await usecase.execute({ ...command, answer: 'sure' } as never);
      expect.fail('expected rejection');
    } catch (err) {
      expect(err).to.be.instanceOf(BadRequestException);
      expect((err as BadRequestException).message).to.match(/decision/i);
    }
  });

  it('rejects a choose settle with an unknown option', async () => {
    const { usecase } = setup({ kind: HumanInteractionKindEnum.CHOOSE });

    try {
      await usecase.execute({ ...command, answer: 'that one', optionId: 'nope' } as never);
      expect.fail('expected rejection');
    } catch (err) {
      expect(err).to.be.instanceOf(BadRequestException);
      expect((err as BadRequestException).message).to.match(/unknown option/i);
    }
  });

  it('queues a line while the call is still dialing', async () => {
    const { usecase, cacheService } = setup({
      handoff: { status: 'dialing', inboundSeq: 0, agentSeq: 0, utterances: [] },
    });
    const clock = sinon.useFakeTimers({ now: Date.now(), shouldAdvanceTime: false });

    try {
      const pending = usecase.execute({ ...command, say: 'Hello there' } as never);
      await clock.tickAsync(26_000);
      const result = await pending;

      expect(result.status).to.equal('ringing');
      expect(cacheService.eval.firstCall.args[2][1]).to.equal('Hello there');
    } finally {
      clock.restore();
    }
  });

  it('returns ringing when the call is still dialing past the wait', async () => {
    const { usecase } = setup({
      handoff: { status: 'dialing', inboundSeq: 0, agentSeq: 0, utterances: [] },
    });
    const clock = sinon.useFakeTimers({ now: Date.now(), shouldAdvanceTime: false });

    try {
      const pending = usecase.execute({ ...command } as never);
      await clock.tickAsync(26_000);
      const result = await pending;
      expect(result.status).to.equal('ringing');
    } finally {
      clock.restore();
    }
  });

  it('listens without say and returns utterances via the agent cursor', async () => {
    const { usecase, cacheService } = setup();

    const result = await usecase.execute({ ...command } as never);

    expect(result).to.deep.equal({
      status: 'utterance',
      utterance: 'yeah go ahead',
      utterances: ['yeah go ahead'],
    });
    expect(cacheService.eval.called).to.equal(true);
  });
});
