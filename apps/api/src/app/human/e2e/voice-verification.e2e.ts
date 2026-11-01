import { AgentIntegrationRepository, HumanContactRepository, IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, ChatProviderIdEnum, HumanChannelViaEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';

const integrationRepository = new IntegrationRepository();
const agentIntegrationRepository = new AgentIntegrationRepository();
const humanContactRepository = new HumanContactRepository();

const VOICE_ENV = [
  'NOVU_VOICE_TWILIO_NUMBER',
  'NOVU_VOICE_ELEVENLABS_PHONE_NUMBER_ID',
  'NOVU_VOICE_ELEVENLABS_AGENT_ID',
  'NOVU_VOICE_ELEVENLABS_VERIFY_AGENT_ID',
  'NOVU_VOICE_ELEVENLABS_API_KEY',
  'IS_AGENT_VOICE_ENABLED',
] as const;

describe('Voice phone verification #novu-v2', () => {
  let session: UserSession;
  const previous: Record<string, string | undefined> = {};
  let subscriberId: string;
  let relayAgentId: string;

  beforeEach(async () => {
    for (const key of VOICE_ENV) {
      previous[key] = process.env[key];
    }
    process.env.NOVU_VOICE_TWILIO_NUMBER = '+15550001111';
    process.env.NOVU_VOICE_ELEVENLABS_PHONE_NUMBER_ID = 'phn_e2e';
    process.env.NOVU_VOICE_ELEVENLABS_AGENT_ID = 'agent_live';
    process.env.NOVU_VOICE_ELEVENLABS_VERIFY_AGENT_ID = 'agent_verify';
    process.env.NOVU_VOICE_ELEVENLABS_API_KEY = 'xi_e2e';
    process.env.IS_AGENT_VOICE_ENABLED = 'true';
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';

    session = new UserSession();
    await session.initialize();

    const realFetch = globalThis.fetch.bind(globalThis);
    sinon.stub(globalThis, 'fetch').callsFake((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('elevenlabs.io')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, conversation_id: 'conv_verify', callSid: 'CA_verify' }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        );
      }

      return realFetch(input, init);
    });
    subscriberId = `voice-verify-${Date.now()}`;

    const setupRes = await session.testAgent.post('/v1/human/setup').send({ subscriberId });
    expect(setupRes.status).to.equal(200, JSON.stringify(setupRes.body));
    relayAgentId = setupRes.body.data.agentId as string;

    const integration = await integrationRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      providerId: ChatProviderIdEnum.AgentVoiceCall,
      channel: ChannelTypeEnum.CHAT,
      credentials: {},
      active: true,
      identifier: `voice-verify-${Date.now()}`,
      priority: 1,
      primary: false,
      deleted: false,
    });
    await agentIntegrationRepository.create({
      _agentId: relayAgentId,
      _integrationId: integration._id,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });
  });

  afterEach(() => {
    sinon.restore();
    for (const key of VOICE_ENV) {
      if (previous[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous[key];
      }
    }
  });

  function dials(): sinon.SinonSpyCall[] {
    return (globalThis.fetch as unknown as sinon.SinonStub)
      .getCalls()
      .filter((call) => String(call.args[0]).includes('elevenlabs.io'));
  }

  it('places a call, confirms the spoken code, and never dials an unverified or removed number', async () => {
    const requested = await session.testAgent.post('/v1/human/verifications/voice').send({
      subscriberId,
      address: '+1 (415) 555-0123',
    });

    expect(requested.status).to.equal(200, JSON.stringify(requested.body));
    expect(requested.body.data.address).to.equal('+***0123');
    expect(requested.body.data.replacesVerifiedAddress).to.equal(false);
    expect(dials()).to.have.length(1);
    const dial = JSON.parse(String(dials()[0].args[1].body));
    expect(dial.agent_id).to.equal('agent_verify');
    expect(dial.conversation_initiation_client_data.custom_llm_extra_body).to.equal(undefined);
    const spoken = String(dial.conversation_initiation_client_data.dynamic_variables.verification_line);
    const spokenCode = spoken.match(/(\d(?:, \d){5})/)?.[1].replace(/, /g, '');
    expect(spokenCode).to.match(/^\d{6}$/);

    const pending = await humanContactRepository.findPendingAddress(
      session.environment._id,
      relayAgentId,
      subscriberId,
      HumanChannelViaEnum.VOICE
    );
    expect(pending?.address).to.equal('+14155550123');
    expect(
      await humanContactRepository.findVerifiedAddress(
        session.environment._id,
        relayAgentId,
        subscriberId,
        HumanChannelViaEnum.VOICE
      )
    ).to.equal(null);

    const wrongCode = spokenCode === '000000' ? '000001' : '000000';
    const wrong = await session.testAgent.post('/v1/human/verifications/voice/confirm').send({
      subscriberId,
      code: wrongCode,
    });
    expect(wrong.status).to.equal(400, JSON.stringify(wrong.body));
    expect(wrong.body.code).to.equal('verification_code_invalid');

    const again = await session.testAgent.post('/v1/human/verifications/voice').send({
      subscriberId,
      address: '+14155550123',
    });
    expect(again.status).to.equal(429, JSON.stringify(again.body));
    expect(dials()).to.have.length(1);

    const unverified = await session.testAgent.post('/v1/human/interactions').send({
      kind: 'approve',
      card: { title: 'Approve the deploy?' },
      to: subscriberId,
      via: 'voice',
    });
    expect(unverified.status).to.equal(404, JSON.stringify(unverified.body));
    expect(String(unverified.body.message)).to.match(/awaiting verification|no verified phone number/i);
    expect(dials()).to.have.length(1);

    const confirmed = await session.testAgent.post('/v1/human/verifications/voice/confirm').send({
      subscriberId,
      code: spokenCode,
    });
    expect(confirmed.status).to.equal(200, JSON.stringify(confirmed.body));
    expect(
      await humanContactRepository.findVerifiedAddress(
        session.environment._id,
        relayAgentId,
        subscriberId,
        HumanChannelViaEnum.VOICE
      )
    ).to.include({ address: '+14155550123' });

    const removed = await session.testAgent.delete(`/v1/human/contacts/${subscriberId}/voice`);
    expect(removed.status).to.equal(200, JSON.stringify(removed.body));
    expect(
      await humanContactRepository.findPendingAddress(
        session.environment._id,
        relayAgentId,
        subscriberId,
        HumanChannelViaEnum.VOICE
      )
    ).to.equal(null);

    const afterRemove = await session.testAgent.post('/v1/human/interactions').send({
      kind: 'approve',
      card: { title: 'Approve the deploy?' },
      to: subscriberId,
      via: 'voice',
    });
    expect(afterRemove.status).to.equal(404);
    expect(String(afterRemove.body.message)).to.match(/no verified phone number/i);
    expect(dials()).to.have.length(1);
  });
});
