import { BadGatewayException, GatewayTimeoutException } from '@nestjs/common';
import { HumanInteractionKindEnum, mintHumanOptions, VoiceCallFailureCodeEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import {
  openingLineFor,
  PlaceVoiceCall,
  VOICE_CALL_REGISTRY_TTL_SECONDS,
  voiceCallRegistryKey,
} from './place-voice-call';
import { parseVoiceCallHandoff } from './voice-call-handoff';

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
      expect((call.args[1] as RequestInit).signal).to.be.instanceOf(AbortSignal);

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
    const storedCall = cacheService.set.getCalls().find((call) => call.args[0] === voiceCallRegistryKey('conv_a'));
    expect(parseVoiceCallHandoff(String(storedCall?.args[1]))).to.include({
      environmentId: 'env1',
      organizationId: 'org1',
      interactionId: 'hi_a',
      subscriberId: 'sub-1',
      status: 'dialing',
    });
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

  it('reports an unconfirmed dial when ElevenLabs does not answer in time', async () => {
    const timeout = new Error('timed out');
    timeout.name = 'TimeoutError';
    sinon.stub(globalThis, 'fetch').rejects(timeout);
    const { place, cacheService } = service();

    try {
      await place.execute({
        interactionId: 'hi_1',
        environmentId: 'env1',
        organizationId: 'org1',
        subscriberId: 'sub-1',
        toNumber: '+15551212',
        openingLine: 'Hello',
      });
      expect.fail('expected an unconfirmed dial');
    } catch (err) {
      expect(err).to.be.instanceOf(GatewayTimeoutException);
      expect((err as GatewayTimeoutException).getResponse()).to.include({ code: 'voice_dial_unconfirmed' });
    }

    expect(cacheService.set.called).to.equal(false);
  });

  it('keeps the placed call and stores the lookup once Redis comes back', async () => {
    sinon.stub(globalThis, 'fetch').resolves(ok('conv_a'));
    let sweep: (() => void) | undefined;
    sinon.stub(global, 'setInterval').callsFake((fn: TimerHandler) => {
      sweep = fn as () => void;

      return 0 as unknown as ReturnType<typeof setInterval>;
    });
    sinon.stub(global, 'clearInterval');
    const { place, cacheService } = service();
    cacheService.set.onFirstCall().rejects(new Error('redis down'));
    cacheService.set.onSecondCall().resolves('OK');

    const placed = await place.execute({
      interactionId: 'hi_1',
      environmentId: 'env1',
      organizationId: 'org1',
      subscriberId: 'sub-1',
      toNumber: '+15551212',
      openingLine: 'Hello',
    });

    // The dial is reported straight away: the lookup is only for a failure webhook.
    expect(placed.conversationId).to.equal('conv_a');
    expect(cacheService.set.callCount).to.equal(1);

    sweep?.();
    await new Promise(setImmediate);

    expect(cacheService.set.callCount).to.equal(2);
    expect(cacheService.set.secondCall.args[0]).to.equal(voiceCallRegistryKey('conv_a'));
  });

  it('drains every waiting call from one sweeper, not a timer for each dial', async () => {
    sinon.stub(globalThis, 'fetch').callsFake(async () => ok('conv_a'));
    const timer = sinon.stub(global, 'setInterval').returns(0 as unknown as ReturnType<typeof setInterval>);
    const { place, cacheService } = service();
    cacheService.set.rejects(new Error('redis down'));

    for (const interactionId of ['hi_1', 'hi_2', 'hi_3']) {
      await place.execute({
        interactionId,
        environmentId: 'env1',
        organizationId: 'org1',
        subscriberId: 'sub-1',
        toNumber: '+15551212',
        openingLine: 'Hello',
      });
    }

    expect(cacheService.set.callCount).to.equal(3);
    expect(timer.calledOnce).to.equal(true);
  });
});

describe('openingLineFor', () => {
  it('introduces the agent, then speaks the title and the body', () => {
    const line = openingLineFor(
      {
        kind: HumanInteractionKindEnum.APPROVE,
        content: { cardChrome: { title: 'Approve the deploy?', body: 'Production, now.' } },
      },
      { agentName: 'Scout' }
    );

    expect(line).to.equal("Hi, it's Scout. Approve the deploy? Production, now.");
  });

  it('greets without a name when the agent has none', () => {
    const line = openingLineFor({
      kind: HumanInteractionKindEnum.APPROVE,
      content: { cardChrome: { title: 'Approve the deploy?' } },
    });

    expect(line).to.equal('Hi. Approve the deploy?');
  });

  it('ends an unpunctuated title so it does not run into the body', () => {
    const line = openingLineFor({
      kind: HumanInteractionKindEnum.APPROVE,
      content: { cardChrome: { title: 'Deploy is ready', body: 'Say yes or no' } },
    });

    expect(line).to.equal('Hi. Deploy is ready. Say yes or no.');
  });

  it('speaks the subtitle and each choice', () => {
    const line = openingLineFor({
      kind: HumanInteractionKindEnum.CHOOSE,
      content: {
        cardChrome: { title: 'Which region?', subtitle: 'Production', options: mintHumanOptions(['US', 'EU']) },
      },
    });

    expect(line).to.equal('Hi. Which region? Production. US. EU.');
  });

  it('strips brackets so v4 does not read card text as an audio tag', () => {
    const line = openingLineFor({
      kind: HumanInteractionKindEnum.APPROVE,
      content: { cardChrome: { title: '[URGENT] Deploy failed' } },
    });

    expect(line).to.equal('Hi. URGENT Deploy failed.');
  });
});
