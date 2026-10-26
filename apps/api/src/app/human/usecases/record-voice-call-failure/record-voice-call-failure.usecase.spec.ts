import { HumanInteractionStatusEnum, VoiceCallFailureCodeEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { voiceCallRegistryKey } from '../../../agents/channels/voice/place-voice-call';
import { RecordVoiceCallFailure } from './record-voice-call-failure.usecase';

describe('RecordVoiceCallFailure', () => {
  const event = {
    type: 'call_initiation_failure',
    data: { conversation_id: 'conv_1', failure_reason: 'busy' },
  };

  function setup() {
    const cacheService = {
      get: sinon.stub().resolves(JSON.stringify({ environmentId: 'env1', organizationId: 'org1' })),
    };
    const interaction = {
      _id: 'row1',
      _environmentId: 'env1',
      identifier: 'hi_1',
      status: HumanInteractionStatusEnum.PENDING,
    };
    const humanInteractionRepository = {
      findPendingByPlatformMessageId: sinon.stub().resolves(interaction),
    };
    const settlement = {
      failVoiceCall: sinon.stub().resolves({ ...interaction, status: HumanInteractionStatusEnum.FAILED }),
    };
    const logger = { setContext: sinon.stub(), warn: sinon.stub() };
    const usecase = new RecordVoiceCallFailure(
      cacheService as never,
      humanInteractionRepository as never,
      settlement as never,
      logger as never
    );

    return { usecase, cacheService, humanInteractionRepository, settlement };
  }

  it('fails the pending call with the webhook reason', async () => {
    const { usecase, settlement, cacheService } = setup();

    await usecase.execute(event);

    expect(cacheService.get.calledOnceWith(voiceCallRegistryKey('conv_1'))).to.equal(true);
    expect(settlement.failVoiceCall.calledOnce).to.equal(true);
    expect(settlement.failVoiceCall.firstCall.args[1].code).to.equal(VoiceCallFailureCodeEnum.BUSY);
  });

  it('does not fail the call again when the conversation is no longer pending', async () => {
    const { usecase, humanInteractionRepository, settlement } = setup();
    humanInteractionRepository.findPendingByPlatformMessageId.onSecondCall().resolves(null);

    await usecase.execute(event);
    await usecase.execute(event);

    expect(settlement.failVoiceCall.calledOnce).to.equal(true);
  });

  it('acknowledges a failure whose lookup has expired', async () => {
    const { usecase, cacheService, settlement } = setup();
    cacheService.get.resolves(null);

    await usecase.execute(event);

    expect(settlement.failVoiceCall.called).to.equal(false);
  });
});
