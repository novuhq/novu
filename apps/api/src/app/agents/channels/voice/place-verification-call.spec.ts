import { BadGatewayException, GatewayTimeoutException } from '@nestjs/common';
import { VoiceCallFailureCodeEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { PlaceVerificationCall, verificationLineFor } from './place-verification-call';

const ENV_KEYS = [
  'NOVU_VOICE_TWILIO_NUMBER',
  'NOVU_VOICE_ELEVENLABS_PHONE_NUMBER_ID',
  'NOVU_VOICE_ELEVENLABS_AGENT_ID',
  'NOVU_VOICE_ELEVENLABS_VERIFY_AGENT_ID',
  'NOVU_VOICE_ELEVENLABS_API_KEY',
  'NOVU_VOICE_ELEVENLABS_API_BASE',
] as const;

describe('PlaceVerificationCall', () => {
  const previous: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      previous[key] = process.env[key];
    }

    process.env.NOVU_VOICE_TWILIO_NUMBER = '+15550001111';
    process.env.NOVU_VOICE_ELEVENLABS_PHONE_NUMBER_ID = 'phn_1';
    process.env.NOVU_VOICE_ELEVENLABS_AGENT_ID = 'agent_live';
    process.env.NOVU_VOICE_ELEVENLABS_VERIFY_AGENT_ID = 'agent_verify';
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
    const logger = { setContext: sinon.stub(), warn: sinon.stub() };

    return new PlaceVerificationCall(logger as never);
  }

  it('speaks the code as separate digits', () => {
    expect(verificationLineFor('421903')).to.equal('Your Novu code is 4, 2, 1, 9, 0, 3. Again, 4, 2, 1, 9, 0, 3.');
  });

  it('dials the verification agent and sends no bridge correlation', async () => {
    const fetchStub = sinon.stub(globalThis, 'fetch').resolves(
      new Response(JSON.stringify({ success: true, conversation_id: 'conv_v', callSid: 'CA_v' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    const placed = await service().execute({
      toNumber: '+15551212',
      verificationLine: verificationLineFor('421903'),
    });

    expect(placed).to.deep.equal({ conversationId: 'conv_v', callSid: 'CA_v' });
    expect(String(fetchStub.firstCall.args[0])).to.equal('https://api.elevenlabs.test/v1/convai/twilio/outbound-call');
    const body = JSON.parse(String((fetchStub.firstCall.args[1] as RequestInit).body));
    expect(body.agent_id).to.equal('agent_verify');
    expect(body.agent_id).to.not.equal('agent_live');
    expect(body.conversation_initiation_client_data.dynamic_variables.verification_line).to.include('4, 2, 1, 9, 0, 3');
    expect(body.conversation_initiation_client_data.custom_llm_extra_body).to.equal(undefined);
    expect(body.conversation_initiation_client_data.conversation_config_override).to.equal(undefined);
  });

  it('refuses to dial when the verification agent is not configured', async () => {
    delete process.env.NOVU_VOICE_ELEVENLABS_VERIFY_AGENT_ID;
    const fetchStub = sinon.stub(globalThis, 'fetch');

    try {
      await service().execute({ toNumber: '+15551212', verificationLine: 'hello' });
      expect.fail('expected voice_not_configured');
    } catch (err) {
      expect(err).to.be.instanceOf(BadGatewayException);
      expect((err as BadGatewayException).getResponse()).to.include({ code: 'voice_not_configured' });
    }

    expect(fetchStub.called).to.equal(false);
  });

  it('turns an invalid number into a coded failure', async () => {
    sinon.stub(globalThis, 'fetch').resolves(new Response('invalid phone number', { status: 400 }));

    try {
      await service().execute({ toNumber: '+100', verificationLine: 'hello' });
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

    try {
      await service().execute({ toNumber: '+15551212', verificationLine: 'hello' });
      expect.fail('expected an unconfirmed dial');
    } catch (err) {
      expect(err).to.be.instanceOf(GatewayTimeoutException);
      expect((err as GatewayTimeoutException).getResponse()).to.include({ code: 'voice_dial_unconfirmed' });
    }
  });
});
