import { createHmac } from 'node:crypto';
import { encryptCredentials } from '@novu/application-generic';
import {
  AgentIntegrationRepository,
  AgentRepository,
  ConversationRepository,
  IntegrationRepository,
  SubscriberRepository,
} from '@novu/dal';
import { AgentSubscriberAccessEnum, ChannelTypeEnum, ChatProviderIdEnum } from '@novu/shared';
import { testServer, UserSession } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { ChatInstanceRegistry } from '../conversation-runtime/ingress/chat-instance.registry';
import { AgentExecutionParams, BridgeExecutorService } from '../conversation-runtime/runtime/bridge-executor.service';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';
import { type PhotonApiStub, startPhotonApiStub } from './helpers/photon-api-stub';

const integrationRepository = new IntegrationRepository();
const agentIntegrationRepository = new AgentIntegrationRepository();
const agentRepository = new AgentRepository();
const subscriberRepository = new SubscriberRepository();
const conversationRepository = new ConversationRepository();

// A Spectrum v0 signing secret with known material, mirroring what
// ConfigurePhotonWebhook would have stored at `credentials.token`.
const PHOTON_WEBHOOK_SECRET = 'e2e-photon-webhook-signing-key';
const USER_PHONE = '+19998887777';
const CHAT_GUID = `any;-;${USER_PHONE}`;

const POLL_TIMEOUT_MS = 10_000;
const POLL_INTERVAL_MS = 50;

async function pollFor<T>(fn: () => Promise<T | null | undefined>, timeoutMs = POLL_TIMEOUT_MS): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const result = await fn();
      if (result) return result;
    } catch (err) {
      lastError = err;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(
    `pollFor timed out after ${timeoutMs}ms${lastError ? `; last error: ${(lastError as Error).message}` : ''}`
  );
}

/** A `normalized-events.v1` inbound message delivery from Spectrum Cloud. */
function buildInboundPayload(
  overrides: { message?: Record<string, unknown> } & Record<string, unknown> = {}
): Record<string, unknown> {
  const { message: messageOverrides, ...rest } = overrides;
  const space = { id: CHAT_GUID, platform: 'imessage' };

  return {
    event: 'messages',
    message: {
      id: `e2e-msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      direction: 'inbound',
      platform: 'imessage',
      timestamp: new Date().toISOString(),
      sender: { id: USER_PHONE, platform: 'imessage' },
      space,
      content: { type: 'text', text: 'Hello agent from iMessage' },
      ...messageOverrides,
    },
    space,
    ...rest,
  };
}

/** Signs the way Spectrum production does: HMAC-SHA256(secret, "v0:" + timestamp + ":" + rawBody). */
function signSpectrumWebhook(rawBody: string): Record<string, string> {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac('sha256', PHOTON_WEBHOOK_SECRET).update(`v0:${timestamp}:${rawBody}`).digest('hex');

  return {
    'x-spectrum-timestamp': timestamp,
    'x-spectrum-signature': `v0=${signature}`,
  };
}

describe('Photon agent webhook - inbound flow #novu-v2', () => {
  let session: UserSession;
  let agentId: string;
  let agentIdentifier: string;
  let integrationId: string;
  let integrationIdentifier: string;
  let bridgeCalls: AgentExecutionParams[];
  let photonApiStub: PhotonApiStub;

  before(async () => {
    (process.env as Record<string, string>).IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
    photonApiStub = await startPhotonApiStub();
  });

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    agentIdentifier = `e2e-photon-agent-${Date.now()}`;
    const createRes = await session.testAgent.post('/v1/agents').send({
      name: 'Photon E2E Agent',
      identifier: agentIdentifier,
    });
    agentId = createRes.body.data._id as string;

    // Custom-code create defaults to restricted; open is required so unknown
    // phones pass null through to the stubbed bridge.
    await agentRepository.update(
      {
        _id: agentId,
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
      },
      { $set: { 'behavior.subscriberAccess': AgentSubscriberAccessEnum.OPEN } }
    );

    const integration = await integrationRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      providerId: ChatProviderIdEnum.PhotonImessage,
      channel: ChannelTypeEnum.CHAT,
      credentials: encryptCredentials({
        apiKey: `e2e-photon-project-${Date.now()}`,
        secretKey: 'e2e-photon-project-secret',
        token: PHOTON_WEBHOOK_SECRET,
      }),
      active: true,
      name: 'Photon Agent E2E',
      identifier: `photon-agent-e2e-${Date.now()}`,
      priority: 1,
      primary: false,
      deleted: false,
    });
    integrationId = String(integration._id);
    integrationIdentifier = integration.identifier;

    await agentIntegrationRepository.create({
      _agentId: agentId,
      _integrationId: integration._id,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    bridgeCalls = [];
    const bridgeExecutor = testServer.getService(BridgeExecutorService);
    sinon.stub(bridgeExecutor, 'execute').callsFake(async (params: AgentExecutionParams) => {
      bridgeCalls.push(params);
    });
  });

  afterEach(async () => {
    const registry = testServer.getService(ChatInstanceRegistry);
    await registry.onModuleDestroy();
    photonApiStub.reset();
    sinon.restore();
  });

  async function postPhotonWebhook(payload: Record<string, unknown>, headers?: Record<string, string>) {
    const rawBody = JSON.stringify(payload);
    let request = session.testAgent
      .post(`/v1/agents/${agentId}/webhook/${integrationIdentifier}`)
      .set('content-type', 'application/json');

    for (const [name, value] of Object.entries(headers ?? signSpectrumWebhook(rawBody))) {
      request = request.set(name, value);
    }

    return request.send(rawBody);
  }

  it('fires the bridge onMessage and creates a conversation for a signed inbound message', async () => {
    const res = await postPhotonWebhook(buildInboundPayload());
    expect(res.status).to.equal(200);

    const call = await pollFor(async () => bridgeCalls[0]);

    expect(call.config.platform).to.equal(AgentPlatformEnum.PHOTON_IMESSAGE);
    expect(call.config.integrationIdentifier).to.equal(integrationIdentifier);
    expect(call.message).to.exist;
    expect(call.message!.text).to.equal('Hello agent from iMessage');
    expect(call.platformContext.threadId).to.be.a('string');
    expect(call.platformContext.isDM).to.equal(true);

    const conversation = await pollFor(() =>
      conversationRepository.findByPlatformThread(
        session.environment._id,
        session.organization._id,
        agentId,
        integrationId,
        call.platformContext.threadId
      )
    );
    expect(conversation.channels[0].platform).to.equal(AgentPlatformEnum.PHOTON_IMESSAGE);
    expect(conversation.channels[0].platformThreadId).to.equal(call.platformContext.threadId);
  });

  it('resolves the subscriber by phone when subscriber.phone matches the sender', async () => {
    const subscriber = await subscriberRepository.create({
      subscriberId: `photon-e2e-sub-${Date.now()}`,
      phone: USER_PHONE,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    const res = await postPhotonWebhook(buildInboundPayload());
    expect(res.status).to.equal(200);

    const call = await pollFor(async () => bridgeCalls[0]);
    expect(call.subscriber).to.exist;
    expect(call.subscriber!.subscriberId).to.equal(subscriber.subscriberId);
  });

  it('acknowledges outbound echoes without dispatching to the bridge', async () => {
    const res = await postPhotonWebhook(buildInboundPayload({ message: { direction: 'outbound' } }));
    expect(res.status).to.equal(200);

    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(bridgeCalls.length).to.equal(0);
  });

  it('rejects a delivery with an invalid signature', async () => {
    const payload = buildInboundPayload();
    const res = await postPhotonWebhook(payload, {
      'x-spectrum-timestamp': String(Math.floor(Date.now() / 1000)),
      'x-spectrum-signature': `v0=${Buffer.from('not-the-signature').toString('hex')}`,
    });

    expect(res.status).to.equal(401);
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(bridgeCalls.length).to.equal(0);
  });

  it('404s inbound deliveries when the webhook secret was never configured', async () => {
    await integrationRepository.update(
      {
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        identifier: integrationIdentifier,
      },
      { $unset: { 'credentials.token': 1 } }
    );

    const res = await postPhotonWebhook(buildInboundPayload());
    expect(res.status).to.equal(404);
  });
});
