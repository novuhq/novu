import { ServiceUnavailableException } from '@nestjs/common';
import { HumanInteractionStatusEnum, VoiceCallEndReasonEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { voiceCallRegistryKey } from '../../../agents/channels/voice/voice-call-handoff';
import { RecordVoiceCallEnded } from './record-voice-call-ended.usecase';

describe('RecordVoiceCallEnded', () => {
  const event = {
    type: 'post_call_transcription' as const,
    data: {
      conversation_id: 'conv_1',
      metadata: { call_duration_secs: 33, termination_reason: 'user hung up' },
    },
  };

  function setup() {
    const interaction = {
      _id: 'row1',
      _environmentId: 'env1',
      identifier: 'hi_1',
      status: HumanInteractionStatusEnum.PENDING,
      deliveries: [
        {
          subscriberId: 'sub-1',
          platform: 'voice',
          platformMessageId: 'conv_1',
          platformThreadId: 'CA_1',
          integrationIdentifier: 'agent-voice-call',
        },
      ],
    };
    const cacheService = {
      get: sinon.stub().resolves(JSON.stringify({ environmentId: 'env1', organizationId: 'org1' })),
      eval: sinon.stub().resolves(1),
    };
    const humanInteractionRepository = {
      findByPlatformMessageId: sinon.stub().resolves(interaction),
      findByIdentifier: sinon.stub().resolves(interaction),
      markVoiceDeliveryEnded: sinon.stub().callsFake(async (...args: unknown[]) => ({
        ...interaction,
        deliveries: [{ ...interaction.deliveries[0], voiceCallEnded: args[4] }],
        voiceSubscriberIds: [],
      })),
    };
    const settlement = {
      settle: sinon.stub().resolves({ ...interaction, status: HumanInteractionStatusEnum.EXPIRED }),
    };
    const logger = { setContext: sinon.stub(), warn: sinon.stub() };
    const usecase = new RecordVoiceCallEnded(
      cacheService as never,
      humanInteractionRepository as never,
      settlement as never,
      logger as never
    );

    return { usecase, cacheService, humanInteractionRepository, settlement };
  }

  it('ends the handoff and expires the interaction', async () => {
    const { usecase, settlement, humanInteractionRepository, cacheService } = setup();

    await usecase.execute(event);

    expect(cacheService.get.calledOnceWith(voiceCallRegistryKey('conv_1'))).to.equal(true);
    expect(cacheService.eval.calledOnce).to.equal(true);
    const ended = humanInteractionRepository.markVoiceDeliveryEnded.firstCall.args[4] as {
      reason: string;
      durationSeconds?: number;
    };
    expect(ended.reason).to.equal(VoiceCallEndReasonEnum.PERSON_HANGUP);
    expect(ended.durationSeconds).to.equal(33);
    expect(settlement.settle.calledOnce).to.equal(true);
    expect(settlement.settle.firstCall.args[1]).to.equal(HumanInteractionStatusEnum.EXPIRED);
  });

  it('keeps the interaction open while a later recipient is still being dialed', async () => {
    const { usecase, humanInteractionRepository, settlement } = setup();
    humanInteractionRepository.markVoiceDeliveryEnded.callsFake(async (...args: unknown[]) => ({
      _id: 'row1',
      _environmentId: 'env1',
      identifier: 'hi_1',
      status: HumanInteractionStatusEnum.PENDING,
      voiceSubscriberIds: ['sub-2'],
      deliveries: [
        {
          subscriberId: 'sub-1',
          platform: 'voice',
          platformMessageId: 'conv_1',
          platformThreadId: 'CA_1',
          integrationIdentifier: 'agent-voice-call',
          voiceCallEnded: args[4],
        },
      ],
    }));

    await usecase.execute(event);

    expect(settlement.settle.called).to.equal(false);
  });

  it('asks the provider to retry when the dial is known but not stored yet', async () => {
    const { usecase, humanInteractionRepository, settlement } = setup();
    humanInteractionRepository.findByPlatformMessageId.resolves(null);

    try {
      await usecase.execute(event);
      expect.fail('expected a retry');
    } catch (err) {
      expect(err).to.be.instanceOf(ServiceUnavailableException);
    }

    expect(settlement.settle.called).to.equal(false);
  });

  it('acknowledges a post-call whose lookup has expired', async () => {
    const { usecase, cacheService, settlement } = setup();
    cacheService.get.resolves(null);

    await usecase.execute(event);

    expect(settlement.settle.called).to.equal(false);
  });
});
