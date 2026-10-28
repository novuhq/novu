import { CacheService } from '@novu/application-generic';
import {
  ConversationActivityRepository,
  ConversationActivitySenderTypeEnum,
  ConversationActivityTypeEnum,
  ConversationParticipantTypeEnum,
  ConversationRepository,
  ConversationStatusEnum,
  HumanInteractionRepository,
  IntegrationRepository,
} from '@novu/dal';
import {
  ChannelTypeEnum,
  ChatProviderIdEnum,
  HumanChannelViaEnum,
  HumanInteractionKindEnum,
  HumanInteractionStatusEnum,
  VoiceCallEndReasonEnum,
} from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import {
  createDialingHandoff,
  postAgentLine,
  readVoiceCallHandoff,
  serializeVoiceCallHandoff,
  VOICE_CALL_REGISTRY_TTL_SECONDS,
  voiceCallRegistryKey,
} from '../../agents/channels/voice/voice-call-handoff';
import { RecordVoiceCallEnded } from '../usecases/record-voice-call-ended/record-voice-call-ended.usecase';

const conversationRepository = new ConversationRepository();
const conversationActivityRepository = new ConversationActivityRepository();
const humanInteractionRepository = new HumanInteractionRepository();
const integrationRepository = new IntegrationRepository();

const BRIDGE_SECRET = 'e2e-voice-bridge-secret';

describe('Voice bridge (completions ↔ turn) #novu-v2', () => {
  let session: UserSession;
  let previousSecret: string | undefined;
  let previousPark: string | undefined;
  let subscriberId: string;
  let relayAgentId: string;
  let integrationId: string;

  beforeEach(async () => {
    previousSecret = process.env.NOVU_VOICE_BRIDGE_SECRET;
    previousPark = process.env.NOVU_VOICE_BRIDGE_PARK_MS;
    process.env.NOVU_VOICE_BRIDGE_SECRET = BRIDGE_SECRET;
    process.env.NOVU_VOICE_BRIDGE_PARK_MS = '8000';
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';

    session = new UserSession();
    await session.initialize();

    subscriberId = `voice-bridge-e2e-${Date.now()}`;
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
      identifier: `voice-e2e-${Date.now()}`,
      priority: 1,
      primary: false,
      deleted: false,
    });
    integrationId = String(integration._id);
  });

  afterEach(() => {
    if (previousSecret === undefined) {
      delete process.env.NOVU_VOICE_BRIDGE_SECRET;
    } else {
      process.env.NOVU_VOICE_BRIDGE_SECRET = previousSecret;
    }

    if (previousPark === undefined) {
      delete process.env.NOVU_VOICE_BRIDGE_PARK_MS;
    } else {
      process.env.NOVU_VOICE_BRIDGE_PARK_MS = previousPark;
    }
  });

  it('speaks the agent line over SSE and stores both turns', async () => {
    const seeded = await seedLiveCall();

    const bridgePromise = fetch(`${session.serverUrl}/v1/human/voice/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${BRIDGE_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'novu-voice-bridge',
        stream: true,
        messages: [
          { role: 'assistant', content: 'Approve the deploy?' },
          { role: 'user', content: 'yeah go ahead after the demo' },
        ],
        elevenlabs_extra_body: {
          interactionId: seeded.interactionIdentifier,
          environmentId: session.environment._id,
          subscriberId,
        },
      }),
    });

    await sleep(500);

    // voice_turn posts a line then waits for the *next* person utterance. Feed the
    // rendezvous directly so this test isolates the bridge SSE path.
    const posted = await postAgentLine(cache(), seeded.elevenLabsConversationId, 'Got it, after the demo.', false);
    expect(posted).to.equal(true);

    const bridgeRes = await bridgePromise;
    expect(bridgeRes.status).to.equal(200);
    const body = await bridgeRes.text();
    expect(body).to.include('Got it, after the demo.');
    expect(body).to.include('data: [DONE]');

    const activities = await conversationActivityRepository.find(
      {
        _environmentId: session.environment._id,
        _conversationId: seeded.conversationId,
        type: ConversationActivityTypeEnum.MESSAGE,
        platform: HumanChannelViaEnum.VOICE,
      },
      '*',
      { sort: { createdAt: 1 } }
    );

    const inbound = activities.filter((row) => row.senderType === ConversationActivitySenderTypeEnum.SUBSCRIBER);
    const outbound = activities.filter((row) => row.senderType === ConversationActivitySenderTypeEnum.AGENT);
    expect(inbound.map((row) => row.content)).to.include('yeah go ahead after the demo');
    expect(outbound.map((row) => row.content)).to.include('Got it, after the demo.');
  });

  it('posts a line through voice_turn and returns the next person utterance', async () => {
    const seeded = await seedLiveCall();

    const turnPromise = session.testAgent
      .post(`/v1/human/interactions/${seeded.interactionIdentifier}/voice/turn`)
      .send({ say: 'Can you confirm once more?' });
    // Superagent does not send until something awaits the request.
    const turnResult = Promise.resolve(turnPromise);

    await waitUntilPending(seeded.elevenLabsConversationId, 'Can you confirm once more?');

    // Simulate the next ElevenLabs turn after the agent line was claimed.
    const bridgeRes = await fetch(`${session.serverUrl}/v1/human/voice/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${BRIDGE_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'assistant', content: 'Can you confirm once more?' },
          { role: 'user', content: 'confirmed' },
        ],
        elevenlabs_extra_body: {
          interactionId: seeded.interactionIdentifier,
          environmentId: session.environment._id,
          subscriberId,
        },
      }),
    });

    // Unblock the bridge park with another agent line so the SSE request finishes.
    await postAgentLine(cache(), seeded.elevenLabsConversationId, 'Thanks.', false);
    expect(bridgeRes.status).to.equal(200);

    const turnRes = await turnResult;
    expect(turnRes.status).to.equal(200, JSON.stringify(turnRes.body));
    const payload = turnRes.body.data ?? turnRes.body;
    expect(payload.status).to.equal('utterance');
    expect(payload.utterance).to.equal('confirmed');
  });

  it('listens without say, then settles with hangup on a clear commitment', async () => {
    const seeded = await seedLiveCall();

    // Person already answered the opening question before the agent listens.
    const firstBridge = fetch(`${session.serverUrl}/v1/human/voice/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${BRIDGE_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'assistant', content: 'Approve the deploy?' },
          { role: 'user', content: 'yeah go ahead' },
        ],
        elevenlabs_extra_body: {
          interactionId: seeded.interactionIdentifier,
          environmentId: session.environment._id,
          subscriberId,
        },
      }),
    });

    // Unblock the park so the bridge finishes after recording the utterance.
    await sleep(300);
    await postAgentLine(cache(), seeded.elevenLabsConversationId, 'holding', false);
    expect((await firstBridge).status).to.equal(200);

    const listenRes = await session.testAgent
      .post(`/v1/human/interactions/${seeded.interactionIdentifier}/voice/turn`)
      .send({});
    expect(listenRes.status).to.equal(200, JSON.stringify(listenRes.body));
    const listenPayload = listenRes.body.data ?? listenRes.body;
    expect(listenPayload.status).to.equal('utterance');
    expect(listenPayload.utterance).to.equal('yeah go ahead');

    const settleRes = await session.testAgent
      .post(`/v1/human/interactions/${seeded.interactionIdentifier}/voice/turn`)
      .send({
        say: 'Got it — hanging up. Thanks.',
        answer: 'yeah go ahead',
        decision: 'approve',
      });
    expect(settleRes.status).to.equal(200, JSON.stringify(settleRes.body));
    const settlePayload = settleRes.body.data ?? settleRes.body;
    expect(settlePayload.status).to.equal('settled');
    expect(settlePayload.interactionStatus).to.equal(HumanInteractionStatusEnum.APPROVED);
    expect(settlePayload.decision).to.equal('approve');
    expect(settlePayload.answer).to.equal('yeah go ahead');

    const settled = await humanInteractionRepository.findByIdentifier(
      session.environment._id,
      seeded.interactionIdentifier
    );
    expect(settled?.status).to.equal(HumanInteractionStatusEnum.APPROVED);
    expect(settled?.response?.text).to.equal('yeah go ahead');
    expect(settled?.response?.optionId).to.equal('approve');
    expect(settled?.response?.respondedBySubscriberId).to.equal(subscriberId);

    const handoff = await readVoiceCallHandoff(cache(), seeded.elevenLabsConversationId);
    expect(handoff?.pendingAgentLine).to.equal('Got it — hanging up. Thanks.');
    expect(handoff?.hangupRequested).to.equal(true);
  });

  it('expires the interaction when a connected call ends with nobody else live', async () => {
    const seeded = await seedLiveCall();
    const interaction = await humanInteractionRepository.findByIdentifier(
      session.environment._id,
      seeded.interactionIdentifier
    );
    expect(interaction).to.not.equal(null);

    const usecase = new RecordVoiceCallEnded(
      cache(),
      humanInteractionRepository,
      {
        settle: async (row, status) => {
          return humanInteractionRepository.settleIfPending(row._environmentId, row._id, status);
        },
      } as never,
      { setContext: () => undefined, warn: () => undefined } as never
    );

    await usecase.closeConnectedCall({
      interaction: interaction!,
      elevenLabsConversationId: seeded.elevenLabsConversationId,
      endReason: VoiceCallEndReasonEnum.PERSON_HANGUP,
      durationSeconds: 42,
    });

    const settled = await humanInteractionRepository.findByIdentifier(
      session.environment._id,
      seeded.interactionIdentifier
    );
    expect(settled?.status).to.equal(HumanInteractionStatusEnum.EXPIRED);
    expect(settled?.deliveries?.[0]?.voiceCallEnded).to.include({
      reason: VoiceCallEndReasonEnum.PERSON_HANGUP,
      durationSeconds: 42,
    });
  });

  async function waitUntilPending(conversationId: string, line: string): Promise<void> {
    const deadline = Date.now() + 5_000;
    while (Date.now() < deadline) {
      const handoff = await readVoiceCallHandoff(cache(), conversationId);
      if (handoff?.pendingAgentLine === line) {
        return;
      }

      await sleep(50);
    }

    throw new Error('voice_turn did not post a line');
  }

  function cache(): CacheService {
    const service = session.testServer?.getService(CacheService);
    if (!service) {
      throw new Error('Voice bridge e2e needs the test server cache.');
    }

    return service;
  }

  async function seedLiveCall() {
    const elevenLabsConversationId = `conv_el_${Date.now()}`;
    const callSid = `CA_${Date.now()}`;
    const interactionIdentifier = `hi_voice_${Date.now()}`;

    const conversation = await conversationRepository.create({
      identifier: `conv_voice_${Date.now()}`,
      _agentId: relayAgentId,
      participants: [
        { type: ConversationParticipantTypeEnum.SUBSCRIBER, id: subscriberId },
        { type: ConversationParticipantTypeEnum.AGENT, id: relayAgentId },
      ],
      channels: [
        {
          platform: HumanChannelViaEnum.VOICE,
          _integrationId: integrationId,
          platformThreadId: callSid,
        },
      ],
      status: ConversationStatusEnum.ACTIVE,
      title: 'Approve the deploy?',
      metadata: {},
      isDirectMessage: true,
      lastActivityAt: new Date().toISOString(),
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    await cache().set(
      voiceCallRegistryKey(elevenLabsConversationId),
      serializeVoiceCallHandoff({
        ...createDialingHandoff({
          environmentId: session.environment._id,
          organizationId: session.organization._id,
          interactionId: interactionIdentifier,
          subscriberId,
        }),
        status: 'live',
        lastBridgeRequestAt: new Date().toISOString(),
      }),
      { ttl: VOICE_CALL_REGISTRY_TTL_SECONDS, jitter: false }
    );

    await humanInteractionRepository.create({
      identifier: interactionIdentifier,
      kind: HumanInteractionKindEnum.APPROVE,
      status: HumanInteractionStatusEnum.PENDING,
      content: { cardChrome: { title: 'Approve the deploy?' } },
      subscriberIds: [subscriberId],
      voiceSubscriberIds: [subscriberId],
      _agentId: relayAgentId,
      deliveries: [
        {
          subscriberId,
          integrationIdentifier: 'agent-voice-call',
          platform: HumanChannelViaEnum.VOICE,
          platformMessageId: elevenLabsConversationId,
          platformThreadId: callSid,
        },
      ],
      _conversationId: conversation._id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    return {
      interactionIdentifier,
      conversationId: conversation._id,
      elevenLabsConversationId,
    };
  }
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
