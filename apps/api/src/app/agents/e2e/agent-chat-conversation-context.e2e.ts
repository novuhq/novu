import { AGENT_EVENT_PROTOCOL_VERSION, type AgentEventEnvelope } from '@novu/agent-event-protocol';
import { WebSocketsQueueService } from '@novu/application-generic';
import { ChatProviderIdEnum, type ContextPayload, WebSocketEventEnum } from '@novu/shared';
import { testServer } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { BridgeExecutorService } from '../conversation-runtime/runtime/bridge-executor.service';
import { AgentTestContext, conversationRepository, setupAgentTestContext } from './helpers/agent-test-setup';

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

describe('Agent Chat - context-scoped conversations #novu-v2', () => {
  let ctx: AgentTestContext;
  let subscriberToken: string;

  before(() => {
    process.env.IS_AGENT_EVENT_PROTOCOL_ENABLED = 'true';
    process.env.IS_AGENT_WEB_CHAT_ENABLED = 'true';
  });

  after(() => {
    delete process.env.IS_AGENT_EVENT_PROTOCOL_ENABLED;
    delete process.env.IS_AGENT_WEB_CHAT_ENABLED;
  });

  beforeEach(async () => {
    ctx = await setupAgentTestContext();

    const bridgeExecutor = testServer.getService(BridgeExecutorService);
    sinon.stub(bridgeExecutor, 'execute').resolves();

    const inboxSession = await ctx.session.testAgent.post('/v1/inbox/session').send({
      applicationIdentifier: ctx.session.environment.identifier,
      subscriberId: ctx.session.subscriberId,
    });
    expect(inboxSession.status).to.equal(201);
    subscriberToken = inboxSession.body.data.token;
  });

  afterEach(() => {
    sinon.restore();
  });

  async function linkAgentChat(agentIdentifier = ctx.agentIdentifier) {
    const res = await ctx.session.testAgent.post(`/v1/agents/${agentIdentifier}/integrations`).send({
      providerId: ChatProviderIdEnum.NovuAgentChat,
    });
    expect(res.status).to.equal(201);

    return res.body.data;
  }

  function createConversation(
    body: { agentId: string; text: string; conversationIdentifier?: string },
    token = subscriberToken
  ) {
    return ctx.session.testAgent
      .post('/v1/agent-chat/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  }

  function listConversations(token = subscriberToken) {
    return ctx.session.testAgent.get('/v1/agent-chat/conversations').set('Authorization', `Bearer ${token}`);
  }

  function getConversation(conversationIdentifier: string, token = subscriberToken) {
    return ctx.session.testAgent
      .get(`/v1/agent-chat/conversations/${conversationIdentifier}`)
      .set('Authorization', `Bearer ${token}`);
  }

  function getEvents(conversationIdentifier: string, token = subscriberToken) {
    return ctx.session.testAgent
      .get(`/v1/agent-chat/conversations/${conversationIdentifier}/events`)
      .set('Authorization', `Bearer ${token}`);
  }

  async function waitForConversation(identifier: string) {
    return pollFor(() =>
      conversationRepository.findOne(
        {
          identifier,
          _environmentId: ctx.session.environment._id,
        },
        '*'
      )
    );
  }

  async function createSubscriberTokenWithContext(context: ContextPayload) {
    const inboxSession = await ctx.session.testAgent.post('/v1/inbox/session').send({
      applicationIdentifier: ctx.session.environment.identifier,
      subscriberId: ctx.session.subscriberId,
      context,
    });
    expect(inboxSession.status).to.equal(201);

    return {
      token: inboxSession.body.data.token as string,
      contextKeys: inboxSession.body.data.contextKeys as string[],
    };
  }

  function messageEnvelope(conversationId: string, messageId: string): AgentEventEnvelope {
    return {
      version: AGENT_EVENT_PROTOCOL_VERSION,
      conversationId,
      agentId: ctx.agentIdentifier,
      runId: 'run-e2e',
      turnId: 'turn-e2e',
      sequence: 1,
      timestamp: new Date().toISOString(),
      event: {
        type: 'message',
        role: 'assistant',
        messageId,
        content: { markdown: `Agent reply ${messageId}` },
      },
    };
  }

  it('should stamp session contextKeys on create and emit AGENT_EVENT with the same keys', async () => {
    await linkAgentChat();
    const { token, contextKeys } = await createSubscriberTokenWithContext({ tenant: 'acme-corp' });
    expect(contextKeys).to.deep.equal(['tenant:acme-corp']);

    const wsQueue = testServer.getService(WebSocketsQueueService);
    const addStub = sinon.stub(wsQueue, 'add');

    const createRes = await createConversation(
      {
        agentId: ctx.agentIdentifier,
        text: 'Context-scoped thread',
      },
      token
    );
    expect(createRes.status).to.equal(201);
    const conversation = await waitForConversation(createRes.body.data.identifier);
    expect(conversation.contextKeys).to.deep.equal(['tenant:acme-corp']);

    const messageId = `msg-context-${Date.now()}`;
    const ingestRes = await ctx.session.testAgent.post('/v1/agents/events/ingest').send({
      events: [messageEnvelope(conversation._id, messageId)],
    });
    expect(ingestRes.status).to.equal(200);

    const liveJob = await pollFor(() => {
      const jobs = addStub
        .getCalls()
        .map((call) => call.args[0])
        .filter(
          (job) =>
            job?.data?.event === WebSocketEventEnum.AGENT_EVENT &&
            (job.data.payload as AgentEventEnvelope)?.event?.type === 'message'
        );

      return jobs[0] ?? null;
    });

    expect(liveJob.data.contextKeys).to.deep.equal(['tenant:acme-corp']);
  });

  it('should isolate list/get/events by inbox session context', async () => {
    await linkAgentChat();
    const acme = await createSubscriberTokenWithContext({ tenant: 'acme-corp' });
    const globex = await createSubscriberTokenWithContext({ tenant: 'globex' });

    const createRes = await createConversation(
      {
        agentId: ctx.agentIdentifier,
        text: 'Acme-only chat',
      },
      acme.token
    );
    expect(createRes.status).to.equal(201);
    const identifier = createRes.body.data.identifier as string;
    await waitForConversation(identifier);

    const acmeList = await listConversations(acme.token);
    expect(acmeList.status).to.equal(200);
    expect(acmeList.body.data.some((item: { identifier: string }) => item.identifier === identifier)).to.equal(true);

    const globexList = await listConversations(globex.token);
    expect(globexList.status).to.equal(200);
    expect(globexList.body.data.some((item: { identifier: string }) => item.identifier === identifier)).to.equal(false);

    const defaultList = await listConversations(subscriberToken);
    expect(defaultList.status).to.equal(200);
    expect(defaultList.body.data.some((item: { identifier: string }) => item.identifier === identifier)).to.equal(
      false
    );

    expect((await getConversation(identifier, acme.token)).status).to.equal(200);
    expect((await getEvents(identifier, acme.token)).status).to.equal(200);
    expect((await getConversation(identifier, globex.token)).status).to.equal(404);
    expect((await getEvents(identifier, globex.token)).status).to.equal(404);
    expect((await getConversation(identifier, subscriberToken)).status).to.equal(404);
  });

  it('should deny resume when session context does not match conversation', async () => {
    await linkAgentChat();
    const acme = await createSubscriberTokenWithContext({ tenant: 'acme-corp' });
    const globex = await createSubscriberTokenWithContext({ tenant: 'globex' });

    const createRes = await createConversation(
      {
        agentId: ctx.agentIdentifier,
        text: 'Acme-only thread',
      },
      acme.token
    );
    expect(createRes.status).to.equal(201);
    const identifier = createRes.body.data.identifier as string;

    const resumeRes = await createConversation(
      {
        agentId: ctx.agentIdentifier,
        text: 'Cross-context resume attempt',
        conversationIdentifier: identifier,
      },
      globex.token
    );
    expect(resumeRes.status).to.equal(404);
  });

  it('should keep no-context sessions working for live emit and REST', async () => {
    await linkAgentChat();
    const wsQueue = testServer.getService(WebSocketsQueueService);
    const addStub = sinon.stub(wsQueue, 'add');

    const createRes = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Default context thread',
    });
    expect(createRes.status).to.equal(201);
    const conversation = await waitForConversation(createRes.body.data.identifier);
    expect(conversation.contextKeys ?? []).to.deep.equal([]);

    const messageId = `msg-default-context-${Date.now()}`;
    await ctx.session.testAgent.post('/v1/agents/events/ingest').send({
      events: [messageEnvelope(conversation._id, messageId)],
    });

    const liveJob = await pollFor(() => {
      const jobs = addStub
        .getCalls()
        .map((call) => call.args[0])
        .filter(
          (job) =>
            job?.data?.event === WebSocketEventEnum.AGENT_EVENT &&
            (job.data.payload as AgentEventEnvelope)?.event?.type === 'message'
        );

      return jobs[0] ?? null;
    });
    expect(liveJob.data.contextKeys).to.deep.equal([]);

    const listRes = await listConversations(subscriberToken);
    expect(listRes.status).to.equal(200);
    expect(
      listRes.body.data.some((item: { identifier: string }) => item.identifier === createRes.body.data.identifier)
    ).to.equal(true);
    expect((await getConversation(createRes.body.data.identifier, subscriberToken)).status).to.equal(200);
  });
});
