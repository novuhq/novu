import { createHash } from '@novu/application-generic';
import { ConversationRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';
import { testServer } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { BridgeExecutorService } from '../conversation-runtime/runtime/bridge-executor.service';
import { AgentTestContext, setupAgentTestContext } from './helpers/agent-test-setup';

const integrationRepository = new IntegrationRepository();
const conversationRepository = new ConversationRepository();

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

describe('Web Chat - agentHash HMAC gate #novu-v2', () => {
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

  async function linkWebChat(agentIdentifier = ctx.agentIdentifier) {
    const res = await ctx.session.testAgent.post(`/v1/agents/${agentIdentifier}/integrations`).send({
      providerId: ChatProviderIdEnum.NovuWebChat,
    });
    expect(res.status).to.equal(201);

    return res.body.data;
  }

  function createConversation(
    body: {
      agentId: string;
      text: string;
      conversationIdentifier?: string;
      agentHash?: string;
    },
    token = subscriberToken
  ) {
    return ctx.session.testAgent.post('/v1/web-chat/conversations').set('Authorization', `Bearer ${token}`).send(body);
  }

  async function setWebChatHmac(enabled: boolean) {
    await integrationRepository.update(
      {
        _environmentId: ctx.session.environment._id,
        _organizationId: ctx.session.organization._id,
        providerId: ChatProviderIdEnum.NovuWebChat,
      },
      {
        $set: {
          'credentials.hmac': enabled,
        },
      }
    );
  }

  function mintAgentHash(agentIdentifier = ctx.agentIdentifier) {
    const secretKey = ctx.session.environment.apiKeys[0].key;

    return createHash(secretKey, agentIdentifier) as string;
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

  it('should allow create without agentHash when web-chat HMAC is off', async () => {
    await linkWebChat();
    await setWebChatHmac(false);

    const res = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'No hash needed',
    });

    expect(res.status).to.equal(201);
    expect(res.body.data.identifier).to.match(/^conv_/);
  });

  it('should allow resume without agentHash when web-chat HMAC is off', async () => {
    await linkWebChat();
    await setWebChatHmac(false);

    const created = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Bootstrap thread',
    });
    expect(created.status).to.equal(201);
    const identifier = created.body.data.identifier as string;
    await waitForConversation(identifier);

    const res = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Resume without hash',
      conversationIdentifier: identifier,
    });

    expect(res.status).to.equal(201);
    expect(res.body.data.identifier).to.equal(identifier);
  });

  it('should reject missing agentHash with 400 when web-chat HMAC is on', async () => {
    await linkWebChat();
    await setWebChatHmac(true);

    const res = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Missing hash',
    });

    expect(res.status).to.equal(400);
    expect(res.body.message).to.equal('Please provide a valid HMAC hash');
  });

  it('should reject invalid agentHash with 400 when web-chat HMAC is on', async () => {
    await linkWebChat();
    await setWebChatHmac(true);

    const res = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Bad hash',
      agentHash: 'not-a-valid-hmac-digest',
    });

    expect(res.status).to.equal(400);
    expect(res.body.message).to.equal('Please provide a valid HMAC hash');
  });

  it('should create when agentHash is valid and agent is published with HMAC on', async () => {
    await linkWebChat();
    await setWebChatHmac(true);

    const res = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Signed agent',
      agentHash: mintAgentHash(),
    });

    expect(res.status).to.equal(201);
    expect(res.body.data.identifier).to.match(/^conv_/);
    expect(res.body.data.messageId).to.match(/^msg_/);
  });

  it('should reject resume with missing agentHash when web-chat HMAC is on', async () => {
    await linkWebChat();
    await setWebChatHmac(false);

    const created = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Bootstrap thread',
    });
    expect(created.status).to.equal(201);
    await waitForConversation(created.body.data.identifier);

    await setWebChatHmac(true);

    const res = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Resume without hash',
      conversationIdentifier: created.body.data.identifier,
    });

    expect(res.status).to.equal(400);
    expect(res.body.message).to.equal('Please provide a valid HMAC hash');
  });

  it('should resume when agentHash is valid with HMAC on', async () => {
    await linkWebChat();
    await setWebChatHmac(true);
    const agentHash = mintAgentHash();

    const created = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'First signed message',
      agentHash,
    });
    expect(created.status).to.equal(201);
    const identifier = created.body.data.identifier as string;
    await waitForConversation(identifier);

    const res = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Resume signed',
      conversationIdentifier: identifier,
      agentHash,
    });

    expect(res.status).to.equal(201);
    expect(res.body.data.identifier).to.equal(identifier);
  });

  it('should still enforce publication when agentHash is valid', async () => {
    await linkWebChat();
    await setWebChatHmac(true);

    const unpublishedIdentifier = `e2e-unpublished-hmac-${Date.now()}`;
    await ctx.session.testAgent.post('/v1/agents').send({
      name: 'Unpublished HMAC Agent',
      identifier: unpublishedIdentifier,
    });

    const res = await createConversation({
      agentId: unpublishedIdentifier,
      text: 'Valid hash, unpublished agent',
      agentHash: mintAgentHash(unpublishedIdentifier),
    });

    expect(res.status).to.equal(400);
    expect(res.body.message).to.equal('This agent is not available on web chat');
  });
});
