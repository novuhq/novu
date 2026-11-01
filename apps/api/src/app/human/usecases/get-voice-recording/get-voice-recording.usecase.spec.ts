import { NotFoundException } from '@nestjs/common';
import { HumanChannelViaEnum, HumanInteractionKindEnum, HumanInteractionStatusEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import * as elevenLabsConversations from '../../../agents/channels/voice/elevenlabs-conversations';
import { GetVoiceRecordingCommand } from './get-voice-recording.command';
import { GetVoiceRecording } from './get-voice-recording.usecase';

describe('GetVoiceRecording', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('proxies the recording for a connected voice delivery', async () => {
    const humanInteractionRepository = {
      findByIdentifier: sinon.stub().resolves({
        identifier: 'hi_1',
        _organizationId: 'org1',
        kind: HumanInteractionKindEnum.ASK,
        status: HumanInteractionStatusEnum.ANSWERED,
        deliveries: [
          {
            subscriberId: 'sub-1',
            integrationIdentifier: 'agent-voice-call',
            platform: HumanChannelViaEnum.VOICE,
            platformMessageId: 'conv_el_1',
            platformThreadId: 'CA_1',
          },
        ],
      }),
    };
    const requireRecording = sinon
      .stub(elevenLabsConversations, 'requireRecording')
      .resolves({ body: Buffer.from('audio'), contentType: 'audio/mpeg' });

    const usecase = new GetVoiceRecording(humanInteractionRepository as never);
    const recording = await usecase.execute(
      GetVoiceRecordingCommand.create({
        environmentId: 'env1',
        organizationId: 'org1',
        userId: 'user1',
        identifier: 'hi_1',
      })
    );

    expect(requireRecording.calledOnceWithExactly('conv_el_1')).to.equal(true);
    expect(recording.contentType).to.equal('audio/mpeg');
    expect(recording.body.toString()).to.equal('audio');
  });

  it('404s when the call never connected', async () => {
    const humanInteractionRepository = {
      findByIdentifier: sinon.stub().resolves({
        identifier: 'hi_1',
        _organizationId: 'org1',
        deliveries: [
          {
            subscriberId: 'sub-1',
            integrationIdentifier: 'agent-voice-call',
            platform: HumanChannelViaEnum.VOICE,
            platformMessageId: 'conv_el_1',
            platformThreadId: 'CA_1',
            voiceFailure: { code: 'voice_busy', message: 'busy' },
          },
        ],
      }),
    };

    const usecase = new GetVoiceRecording(humanInteractionRepository as never);

    try {
      await usecase.execute(
        GetVoiceRecordingCommand.create({
          environmentId: 'env1',
          organizationId: 'org1',
          userId: 'user1',
          identifier: 'hi_1',
        })
      );
      expect.fail('expected NotFoundException');
    } catch (err) {
      expect(err).to.be.instanceOf(NotFoundException);
    }
  });
});
