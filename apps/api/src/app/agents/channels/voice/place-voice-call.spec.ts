import { BadGatewayException } from '@nestjs/common';
import { HumanInteractionKindEnum, VoiceCallFailureCodeEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import {
  openingLineFor,
  PlaceVoiceCall,
  VOICE_CALL_REGISTRY_TTL_SECONDS,
  voiceCallRegistryKey,
} from './place-voice-call';

const ENV_KEYS = [
  'NOVU_VOICE_TWILIO_NUMBER',
  'NOVU_VOICE_ELEVENLABS_PHONE_NUMBER_ID',
  'NOVU_VOICE_ELEVENLABS_AGENT_ID',
  'NOVU_VOICE_ELEVENLABS_API_KEY',
  'NOVU_VOICE_ELEVENLABS_API_BASE',
] as const;

describe('PlaceVoiceCall', () => {
  const previous: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      previous[key] = process.env[key];
    }

    process.env.NOVU_VOICE_TWILIO_NUMBER = '+15550001111';
    process.env.NOVU_VOICE_ELEVENLABS_PHONE_NUMBER_ID = 'phn_1';
    process.env.NOVU_VOICE_ELEVENLABS_AGENT_ID = 'agent_1';
    process.env.NOVU_VOICE_ELEVENLABS_API_KEY = 'xi_test';
    process.env.NOVU_VOICE_ELEVENLABS_API_BASE = 'https://api.elevenlabs.test';
  });

  afterEach(() => {
    sinon.restore();
    for (const key of ENV_KEYS) {
      if (previous[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous[key];
      }
    }
  });

  function service() {
    const cacheService = { set: sinon.stub().resolves('OK') };
    const logger = { setContext: sinon.stub(), warn: sinon.stub() };

    return { cacheService, place: new PlaceVoiceCall(cacheService as never, logger as never) };
  }

  function ok(conversationId: string, callSid?: string) {
    return new Response(
      JSON.stringify({
        success: true,
        message: 'ok',
        conversation_id: conversationId,
        ...(callSid ? { callSid } : {}),
      }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  }

  it('sends a different opening line on each concurrent call and never patches the shell', async () => {
    const fetchStub = sinon.stub(globalThis, 'fetch');
    fetchStub.onFirstCall().resolves(ok('conv_a', 'CA_a'));
    fetchStub.onSecondCall().resolves(ok('conv_b', 'CA_b'));
    const { place, cacheService } = service();
    const input = {
      interactionId: 'hi_1',
      environmentId: 'env1',
      organizationId: 'org1',
      subscriberId: 'sub-1',
      toNumber: '+15551212',
    };

    const [first, second] = await Promise.all([
      place.execute({ ...input, interactionId: 'hi_a', openingLine: 'Approve the deploy?' }),
      place.execute({ ...input, interactionId: 'hi_b', toNumber: '+15559999', openingLine: 'Choose a region.' }),
    ]);

    expect(first).to.deep.equal({ conversationId: 'conv_a', callSid: 'CA_a' });
    expect(second).to.deep.equal({ conversationId: 'conv_b', callSid: 'CA_b' });
    expect(fetchStub.calledTwice).to.equal(true);

    const bodies = fetchStub.getCalls().map((call) => {
      expect(String(call.args[0])).to.equal('https://api.elevenlabs.test/v1/convai/twilio/outbound-call');
      expect((call.args[1] as RequestInit).method).to.equal('POST');

      return JSON.parse(String((call.args[1] as RequestInit).body));
    });
    const lines = bodies.map((body) => body.conversation_initiation_client_data.dynamic_variables.opening_line);
    expect(lines).to.have.members(['Approve the deploy?', 'Choose a region.']);
    expect(
      bodies.every((body) => body.conversation_initiation_client_data.conversation_config_override === undefined)
    ).to.equal(true);
    expect(fetchStub.getCalls().every((call) => !String(call.args[0]).includes('/convai/agents'))).to.equal(true);
    expect(bodies[0].conversation_initiation_client_data.custom_llm_extra_body).to.deep.equal({
      interactionId: 'hi_a',
      environmentId: 'env1',
      subscriberId: 'sub-1',
    });
    expect(
      cacheService.set.calledWith(voiceCallRegistryKey('conv_a'), sinon.match.string, {
        ttl: VOICE_CALL_REGISTRY_TTL_SECONDS,
        jitter: false,
      })
    ).to.equal(true);
  });

  it('turns an invalid-number response into a coded delivery failure', async () => {
    sinon.stub(globalThis, 'fetch').resolves(new Response('invalid phone number', { status: 400 }));
    const { place } = service();

    try {
      await place.execute({
        interactionId: 'hi_1',
        environmentId: 'env1',
        organizationId: 'org1',
        subscriberId: 'sub-1',
        toNumber: '+100',
        openingLine: 'Hello',
      });
      expect.fail('expected a delivery failure');
    } catch (err) {
      expect(err).to.be.instanceOf(BadGatewayException);
      expect((err as BadGatewayException).getResponse()).to.include({ code: VoiceCallFailureCodeEnum.INVALID_NUMBER });
    }
  });
});

describe('openingLineFor', () => {
  it('speaks the title and then the body', () => {
    const line = openingLineFor({
      kind: HumanInteractionKindEnum.APPROVE,
      content: { cardChrome: { title: 'Approve the deploy?', body: 'Production, now.' } },
    });

    expect(line).to.equal('Approve the deploy? Production, now.');
  });
});
