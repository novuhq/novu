/**
 * Agent ↔ Web chat contract test.
 *
 * Exercises the full web channel path with no stubs on the contract surface:
 *
 *  1. mints a real subscriber JWT via `POST /v1/inbox/session` (the same
 *     session the Inbox uses — decision: web chat reuses it);
 *  2. POSTs a message to the subscriber-facing SSE endpoint
 *     (`/v1/agents/web/:agentIdentifier/conversations/:conversationId/messages`),
 *     which dispatches natively into the chat SDK (`chat.processMessage`) and
 *     through a real bridge HTTP roundtrip (in-process `@novu/framework`
 *     server);
 *  3. the bridge reply lands via `POST /v1/agents/:id/reply` →
 *     OutboundGateway → `@novu/chat-adapter-web` → Redis pub/sub relay →
 *     the open SSE stream, and the response body carries the AI SDK
 *     data-stream frames;
 *  4. card action ids survive tokenization end-to-end: the tokenized id read
 *     from the SSE `data-card` frame routes back through `POST .../actions`
 *     and reaches the bridge `onAction` with the original id.
 *
 * Cross-instance delivery is covered implicitly: the reply POST and the SSE
 * request are independent HTTP connections bridged only by Redis pub/sub.
 */

import { encryptCredentials } from '@novu/application-generic';
import {
  AgentIntegrationRepository,
  AgentRepository,
  ConversationActivitySenderTypeEnum,
  ConversationActivityTypeEnum,
  IntegrationRepository,
} from '@novu/dal';
import type { AgentAction } from '@novu/framework';
import { Actions, Button, Card, CardText } from '@novu/framework/express';
import { ChannelTypeEnum, ChatProviderIdEnum } from '@novu/shared';
import { testServer, UserSession } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { ChatInstanceRegistry } from '../conversation-runtime/ingress/chat-instance.registry';
import { BridgeExecutorService } from '../conversation-runtime/runtime/bridge-executor.service';
import { activityRepository, conversationRepository } from './helpers/agent-test-setup';
import { BridgeExecutorStubHandle, stubBridgeExecutorWithRealHttp } from './helpers/bridge-executor-test-stub';
import { BridgeServerHandle, startBridgeServer } from './helpers/bridge-server';

const BRIDGE_DRAIN_TIMEOUT_MS = 10_000;
const SUBSCRIBER_A = 'web-e2e-user-a';
const SUBSCRIBER_B = 'web-e2e-user-b';

const agentRepository = new AgentRepository();
const integrationRepository = new IntegrationRepository();
const agentIntegrationRepository = new AgentIntegrationRepository();

interface WebAgentTestContext {
  session: UserSession;
  agentId: string;
  agentIdentifier: string;
  integrationId: string;
  integrationIdentifier: string;
}

async function setupWebAgentTestContext(): Promise<WebAgentTestContext> {
  const session = new UserSession();
  await session.initialize();

  const agentIdentifier = `e2e-web-agent-${Date.now()}`;
  const createRes = await session.testAgent.post('/v1/agents').send({
    name: 'Web E2E Agent',
    identifier: agentIdentifier,
  });
  const agentId = createRes.body.data._id as string;

  const integration = await integrationRepository.create({
    _environmentId: session.environment._id,
    _organizationId: session.organization._id,
    providerId: ChatProviderIdEnum.NovuWeb,
    channel: ChannelTypeEnum.CHAT,
    credentials: encryptCredentials({}),
    active: true,
    name: 'Web Agent E2E',
    identifier: `web-agent-e2e-${Date.now()}`,
    priority: 1,
    primary: false,
    deleted: false,
  });

  await agentIntegrationRepository.create({
    _agentId: agentId,
    _integrationId: integration._id,
    _environmentId: session.environment._id,
    _organizationId: session.organization._id,
  });

  return {
    session,
    agentId,
    agentIdentifier,
    integrationId: integration._id,
    integrationIdentifier: integration.identifier,
  };
}

async function mintSubscriberToken(session: UserSession, subscriberId: string): Promise<string> {
  const res = await session.testAgent.post('/v1/inbox/session').send({
    applicationIdentifier: session.environment.identifier,
    subscriberId,
  });

  expect(res.status, JSON.stringify(res.body)).to.equal(201);

  return res.body.data.token as string;
}

type SseFrame = Record<string, unknown> & { type: string };

/** Parses the buffered SSE body into JSON frames; `[DONE]` is dropped after verification. */
function parseSseFrames(body: string): { frames: SseFrame[]; done: boolean } {
  const frames: SseFrame[] = [];
  let done = false;

  for (const line of body.split('\n')) {
    if (!line.startsWith('data:')) continue;
    const payload = line.slice('data:'.length).trim();
    if (payload === '[DONE]') {
      done = true;
      continue;
    }

    frames.push(JSON.parse(payload) as SseFrame);
  }

  return { frames, done };
}

function findCardButtonId(node: Record<string, unknown> | undefined): string | undefined {
  if (!node || typeof node !== 'object') return undefined;
  if (node.type === 'button' && typeof node.id === 'string') return node.id;

  const children = node.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      const found = findCardButtonId(child as Record<string, unknown>);
      if (found) return found;
    }
  }

  return undefined;
}

describe('Agent Web Chat Roundtrip #novu-v2', () => {
  let ctx: WebAgentTestContext;
  let subscriberToken: string;
  let bridge: BridgeServerHandle | undefined;
  let bridgeStub: BridgeExecutorStubHandle;

  /** Programmable handlers swapped in per-test before the bridge fires. */
  let onMessageHandler: Parameters<typeof startBridgeServer>[0]['handlers']['onMessage'] = async () => {};
  let onActionHandler: NonNullable<Parameters<typeof startBridgeServer>[0]['handlers']['onAction']> = async () => {};

  before(() => {
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
    // Short turn-close timers so each SSE request settles quickly after the
    // bridge reply instead of waiting out the production defaults.
    process.env.AGENT_WEB_SSE_SETTLE_MS = '500';
    process.env.AGENT_WEB_SSE_FIRST_EVENT_TIMEOUT_MS = '8000';
  });

  after(() => {
    delete process.env.AGENT_WEB_SSE_SETTLE_MS;
    delete process.env.AGENT_WEB_SSE_FIRST_EVENT_TIMEOUT_MS;
  });

  beforeEach(async () => {
    ctx = await setupWebAgentTestContext();
    subscriberToken = await mintSubscriberToken(ctx.session, SUBSCRIBER_A);

    bridge = await startBridgeServer({
      agentId: ctx.agentIdentifier,
      handlers: {
        onMessage: (message, agentCtx) => onMessageHandler(message, agentCtx),
        onAction: (action, agentCtx) => onActionHandler(action, agentCtx),
      },
      secretKey: ctx.session.apiKey,
    });

    // Repoint the agent's bridgeUrl at our in-process bridge. The PATCH endpoint
    // gates on a SSRF check that rejects loopback IPs, so we update the entity
    // directly via the repository — we're testing the runtime contract, not the
    // PATCH validation.
    await agentRepository.update(
      { _id: ctx.agentId, _environmentId: ctx.session.environment._id },
      { $set: { bridgeUrl: bridge.url } }
    );

    bridgeStub = stubBridgeExecutorWithRealHttp(testServer.getService(BridgeExecutorService));
  });

  afterEach(async () => {
    if (bridge) {
      await bridge.close();
      bridge = undefined;
    }

    const registry = testServer.getService(ChatInstanceRegistry) as unknown as {
      instances: { clear: () => void };
    };
    registry.instances.clear();

    sinon.restore();
  });

  function postMessage(conversationId: string, text: string, token = subscriberToken) {
    return ctx.session.testAgent
      .post(`/v1/agents/web/${ctx.agentIdentifier}/conversations/${conversationId}/messages`)
      .set('authorization', `Bearer ${token}`)
      .send({ text });
  }

  it('streams the bridge reply back over SSE and persists the conversation', async () => {
    onMessageHandler = async (_message, agentCtx) => {
      await agentCtx.reply('pong');
    };

    const conversationId = `conv-${Date.now()}`;
    const res = await postMessage(conversationId, 'ping');

    expect(res.status, res.text).to.equal(200);
    expect(res.headers['content-type']).to.contain('text/event-stream');

    const { frames, done } = parseSseFrames(res.text);
    const types = frames.map((frame) => frame.type);

    expect(types[0], 'protocol start frame first').to.equal('start');
    expect(types, 'reply message grouped by data-message-start').to.include('data-message-start');
    expect(types[types.length - 1], 'protocol finish frame last').to.equal('finish');
    expect(done, 'stream [DONE] terminated').to.equal(true);
    // The reply content arrives as a text block, or as a data-card when the
    // free-plan "Powered by Novu" watermark wraps markdown into a card.
    expect(res.text, 'bridge reply content present in the stream').to.contain('pong');

    // Conversation bound to the web platform thread id (subscriber embedded).
    const conversation = await conversationRepository.findByPlatformThread(
      ctx.session.environment._id,
      ctx.session.organization._id,
      ctx.agentId,
      ctx.integrationId,
      `web:${SUBSCRIBER_A}:${conversationId}`
    );
    expect(conversation, 'conversation persisted for the web thread').to.exist;
    expect(conversation!.participants.some((p) => p.type === 'subscriber' && p.id === SUBSCRIBER_A)).to.equal(true);

    const activities = await activityRepository.findByConversation(ctx.session.environment._id, conversation!._id);
    const inbound = activities.find(
      (a) =>
        a.type === ConversationActivityTypeEnum.MESSAGE &&
        a.senderType === ConversationActivitySenderTypeEnum.SUBSCRIBER
    );
    const agentReply = activities.find(
      (a) =>
        a.type === ConversationActivityTypeEnum.MESSAGE && a.senderType === ConversationActivitySenderTypeEnum.AGENT
    );

    expect(inbound, 'inbound message persisted').to.exist;
    expect(inbound!.content).to.equal('ping');
    expect(inbound!.senderId).to.equal(SUBSCRIBER_A);
    expect(agentReply, 'agent reply persisted').to.exist;
  });

  it('serves conversation list and folded message history to the owning subscriber', async () => {
    onMessageHandler = async (_message, agentCtx) => {
      await agentCtx.reply('history-reply');
    };

    const conversationId = `conv-${Date.now()}`;
    await postMessage(conversationId, 'first message');

    const listRes = await ctx.session.testAgent
      .get(`/v1/agents/web/${ctx.agentIdentifier}/conversations`)
      .set('authorization', `Bearer ${subscriberToken}`);

    expect(listRes.status, JSON.stringify(listRes.body)).to.equal(200);
    expect(listRes.body.data, 'one conversation listed').to.have.length(1);
    expect(listRes.body.data[0].id).to.equal(conversationId);
    expect(listRes.body.hasMore).to.equal(false);

    const messagesRes = await ctx.session.testAgent
      .get(`/v1/agents/web/${ctx.agentIdentifier}/conversations/${conversationId}/messages`)
      .set('authorization', `Bearer ${subscriberToken}`);

    expect(messagesRes.status, JSON.stringify(messagesRes.body)).to.equal(200);
    const messages = messagesRes.body.data as Array<{ role: string; parts: Array<{ type: string }> }>;
    expect(messages.length, 'user + agent messages in history').to.be.gte(2);
    expect(messages[0].role, 'history is chronological (user first)').to.equal('user');
    expect(messages.some((m) => m.role === 'agent')).to.equal(true);

    // A brand-new conversation id yields an empty page (not a 404) so fresh
    // threads render before the first send.
    const emptyRes = await ctx.session.testAgent
      .get(`/v1/agents/web/${ctx.agentIdentifier}/conversations/never-used/messages`)
      .set('authorization', `Bearer ${subscriberToken}`);
    expect(emptyRes.status).to.equal(200);
    expect(emptyRes.body.data).to.deep.equal([]);
  });

  it('routes tokenized card actions from the SSE frame back to the bridge onAction', async () => {
    onMessageHandler = async (_message, agentCtx) => {
      await agentCtx.reply(
        Card({
          title: 'Confirm pickup',
          children: [
            CardText('Your order is ready.'),
            Actions([Button({ id: 'confirm-web', label: 'Confirm', style: 'primary' })]),
          ],
        })
      );
    };

    let resolveAction: (action: AgentAction) => void;
    const actionReceived = new Promise<AgentAction>((resolve) => {
      resolveAction = resolve;
    });
    onActionHandler = async (action) => {
      resolveAction(action);
    };

    const conversationId = `conv-${Date.now()}`;
    const res = await postMessage(conversationId, 'send me a card');
    expect(res.status, res.text).to.equal(200);

    const { frames } = parseSseFrames(res.text);
    const cardFrame = frames.find((frame) => frame.type === 'data-card');
    expect(cardFrame, 'card delivered as a data-card frame').to.exist;

    const card = (cardFrame!.data as { card: Record<string, unknown> }).card;
    const deliveredActionId = findCardButtonId(card);
    expect(deliveredActionId, 'card button carries an action id').to.be.a('string');

    const actionRes = await ctx.session.testAgent
      .post(`/v1/agents/web/${ctx.agentIdentifier}/conversations/${conversationId}/actions`)
      .set('authorization', `Bearer ${subscriberToken}`)
      .send({ actionId: deliveredActionId });

    expect(actionRes.status, actionRes.text).to.equal(200);

    const action = await Promise.race([
      actionReceived,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('bridge onAction not reached')), BRIDGE_DRAIN_TIMEOUT_MS)
      ),
    ]);

    // Tokenization is transparent to the bridge: the original id round-trips.
    expect(action.id).to.equal('confirm-web');
  });

  it('isolates conversations between subscribers (structural 404s)', async () => {
    onMessageHandler = async (_message, agentCtx) => {
      await agentCtx.reply('private');
    };

    const conversationId = `conv-${Date.now()}`;
    await postMessage(conversationId, 'secret message');

    const tokenB = await mintSubscriberToken(ctx.session, SUBSCRIBER_B);

    // Subscriber B addressing A's conversation id resolves to B's own (empty)
    // thread — never A's data.
    const foreignGet = await ctx.session.testAgent
      .get(`/v1/agents/web/${ctx.agentIdentifier}/conversations/${conversationId}`)
      .set('authorization', `Bearer ${tokenB}`);
    expect(foreignGet.status).to.equal(404);

    const foreignMessages = await ctx.session.testAgent
      .get(`/v1/agents/web/${ctx.agentIdentifier}/conversations/${conversationId}/messages`)
      .set('authorization', `Bearer ${tokenB}`);
    expect(foreignMessages.status).to.equal(200);
    expect(foreignMessages.body.data, "B never sees A's messages").to.deep.equal([]);

    const foreignList = await ctx.session.testAgent
      .get(`/v1/agents/web/${ctx.agentIdentifier}/conversations`)
      .set('authorization', `Bearer ${tokenB}`);
    expect(foreignList.body.data).to.deep.equal([]);

    // Unauthenticated requests are rejected outright.
    const unauthenticated = await ctx.session.testAgent.get(`/v1/agents/web/${ctx.agentIdentifier}/conversations`);
    expect(unauthenticated.status).to.equal(401);
  });

  it('rejects invalid conversation ids and unknown agents', async () => {
    const badConversation = await postMessage('has:colon', 'hello');
    expect(badConversation.status).to.equal(400);

    const unknownAgent = await ctx.session.testAgent
      .post(`/v1/agents/web/not-a-real-agent/conversations/conv-1/messages`)
      .set('authorization', `Bearer ${subscriberToken}`)
      .send({ text: 'hello' });
    expect(unknownAgent.status).to.equal(404);
  });
});
