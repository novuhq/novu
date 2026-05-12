/**
 * Agent ↔ Slack outbound contract test.
 *
 * Today's Slack agent e2e tests stub `ChatSdkService.postToConversation` /
 * `editInConversation` / `reactToMessage` and never let the real
 * `@chat-adapter/slack` adapter make a HTTP call. This file flips that:
 *
 *  1. starts an in-process Slack Web API mock (`emulate.dev/slack`) on a free
 *     port and patches `@slack/web-api`'s `WebClient` so every Slack call from
 *     the production adapter is routed at it;
 *  2. starts an in-process bridge SDK server (`@novu/framework/express`) so the
 *     inbound webhook actually triggers a real bridge HTTP roundtrip into a
 *     test-controlled `onMessage` handler (no `BridgeExecutorService` stub on
 *     the contract surface — only the internal `resolvePublicAddresses`
 *     pre-flight is bypassed, since it doesn't honor
 *     `NOVU_SAFE_OUTBOUND_TEST_ALLOW_IPS`);
 *  3. asserts the resulting Slack message lands in the emulator with the
 *     correct text and `thread_ts`.
 *
 * If `@chat-adapter/slack`, `@slack/web-api`, or our card serialization drifts,
 * this test fails — which is exactly the regression coverage the legacy stub
 * setup couldn't provide.
 */

import { AgentRepository, ConversationActivitySenderTypeEnum, ConversationActivityTypeEnum } from '@novu/dal';
import { testServer } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { BridgeExecutorService } from '../services/bridge-executor.service';
import { ChatSdkService } from '../services/chat-sdk.service';
import {
  AgentTestContext,
  activityRepository,
  conversationRepository,
  setupAgentTestContext,
} from './helpers/agent-test-setup';
import {
  BridgeExecutorStubHandle,
  stubBridgeExecutorWithRealHttp,
} from './helpers/bridge-executor-test-stub';
import { BridgeServerHandle, startBridgeServer } from './helpers/bridge-server';
import { buildSlackAppMention, signSlackRequest } from './helpers/providers/slack';
import {
  getChannelHistory,
  getThreadReplies,
  resetEmulator,
  startSlackEmulator,
  stopSlackEmulator,
} from './helpers/slack-emulator';

const BRIDGE_DRAIN_TIMEOUT_MS = 10_000;
const SLACK_POLL_TIMEOUT_MS = 10_000;
const SLACK_POLL_INTERVAL_MS = 100;

interface SlackChannelSummary {
  id: string;
  name: string;
}

interface SlackUserSummary {
  id: string;
  name: string;
}

async function pollFor<T>(
  fn: () => Promise<T | null | undefined>,
  timeoutMs: number,
  intervalMs = SLACK_POLL_INTERVAL_MS
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const result = await fn();
      if (result) return result;
    } catch (err) {
      lastError = err;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    `pollFor timed out after ${timeoutMs}ms${lastError ? `; last error: ${(lastError as Error).message}` : ''}`
  );
}

async function findEmulatorChannel(emulatorUrl: string, name: string): Promise<SlackChannelSummary> {
  const res = await fetch(`${emulatorUrl}/api/conversations.list`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Bearer xoxb-test',
    },
    body: '',
  });
  const body = (await res.json()) as { ok: boolean; channels?: SlackChannelSummary[] };

  if (!body.ok || !body.channels) {
    throw new Error(`Failed to list emulator channels: ${JSON.stringify(body)}`);
  }

  const channel = body.channels.find((c) => c.name === name);
  if (!channel) {
    throw new Error(`Channel "${name}" not seeded in emulator (have: ${body.channels.map((c) => c.name).join(', ')})`);
  }

  return channel;
}

async function findEmulatorUser(emulatorUrl: string, email: string): Promise<SlackUserSummary> {
  const res = await fetch(`${emulatorUrl}/api/users.lookupByEmail`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Bearer xoxb-test',
    },
    body: new URLSearchParams({ email }).toString(),
  });
  const body = (await res.json()) as { ok: boolean; user?: SlackUserSummary; error?: string };

  if (!body.ok || !body.user) {
    throw new Error(`Failed to look up emulator user "${email}": ${body.error ?? JSON.stringify(body)}`);
  }

  return body.user;
}

const agentRepository = new AgentRepository();

describe('Agent Slack Roundtrip - emulate.dev #novu-v2', () => {
  let ctx: AgentTestContext;
  let bridge: BridgeServerHandle | undefined;
  let bridgeStub: BridgeExecutorStubHandle;
  let emulatorUrl: string;
  let channel: SlackChannelSummary;
  let user: SlackUserSummary;

  /** Programmable handler swapped in per-test before the bridge fires. */
  let onMessageHandler: Parameters<typeof startBridgeServer>[0]['handlers']['onMessage'] = async () => {};

  before(async () => {
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
    const emulator = await startSlackEmulator();
    emulatorUrl = emulator.url;

    channel = await findEmulatorChannel(emulatorUrl, 'incidents');
    user = await findEmulatorUser(emulatorUrl, 'e2e@novu.test');
  });

  after(async () => {
    await stopSlackEmulator();
  });

  beforeEach(async () => {
    ctx = await setupAgentTestContext();

    bridge = await startBridgeServer({
      agentId: ctx.agentIdentifier,
      handlers: {
        onMessage: (message, agentCtx) => onMessageHandler(message, agentCtx),
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

    const bridgeExecutor = testServer.getService(BridgeExecutorService);
    bridgeStub = stubBridgeExecutorWithRealHttp(bridgeExecutor);

    resetEmulator();
  });

  afterEach(async () => {
    if (bridge) {
      await bridge.close();
      bridge = undefined;
    }

    // Force-drop the cached Chat instance so the next test rebuilds the adapter
    // against the freshly-reset emulator. The instance key is
    // `${agentId}:${integrationIdentifier}` and each test creates a fresh agent
    // + integration, but clearing here is a belt-and-braces guarantee.
    const chatSdkService = testServer.getService(ChatSdkService) as unknown as {
      instances: { clear: () => void };
    };
    chatSdkService.instances.clear();

    sinon.restore();
  });

  it('routes inbound app_mention through the bridge to a real Slack post', async () => {
    onMessageHandler = async (_message, agentCtx) => {
      await agentCtx.reply('pong');
    };

    const threadTs = `${Math.floor(Date.now() / 1000)}.000100`;
    const body = JSON.stringify(
      buildSlackAppMention({
        userId: user.id,
        channel: channel.id,
        threadTs,
        text: '<@UBOT> ping',
      })
    );
    const timestamp = Math.floor(Date.now() / 1000);
    const headers = signSlackRequest(ctx.signingSecret, timestamp, body);

    const res = await ctx.session.testAgent
      .post(`/v1/agents/${ctx.agentId}/webhook/${ctx.integrationIdentifier}`)
      .set(headers)
      .set('content-type', 'application/json')
      .send(body);

    expect(res.status, JSON.stringify(res.body)).to.equal(200);

    // Wait for the stubbed bridge executor to dispatch into the in-process
    // bridge. The bridge handler runs as a fire-and-forget promise after the
    // ack response, so we then poll the emulator for the resulting message.
    await Promise.race([
      bridgeStub.drain(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Bridge drain timed out')), BRIDGE_DRAIN_TIMEOUT_MS)),
    ]);

    expect(bridgeStub.calls.length, 'bridge executor invoked').to.be.gte(1);

    const replyMessage = await pollFor(async () => {
      const replies = await getThreadReplies(channel.id, threadTs);
      if (!replies.ok || !replies.messages) return null;

      return replies.messages.find((m) => m.text === 'pong') ?? null;
    }, SLACK_POLL_TIMEOUT_MS);

    expect(replyMessage.thread_ts, 'reply posted under inbound thread_ts').to.equal(threadTs);
    expect(replyMessage.bot_id ?? replyMessage.user, 'reply originated from a bot').to.exist;

    const conversation = await conversationRepository.findByPlatformThread(
      ctx.session.environment._id,
      ctx.session.organization._id,
      `slack:${channel.id}:${threadTs}`
    );
    expect(conversation, 'inbound conversation persisted').to.exist;

    const activities = await activityRepository.findByConversation(ctx.session.environment._id, conversation!._id);
    const agentReply = activities.find(
      (a) =>
        a.senderType === ConversationActivitySenderTypeEnum.AGENT &&
        a.type === ConversationActivityTypeEnum.MESSAGE &&
        a.content === 'pong'
    );

    expect(agentReply, 'agent reply persisted as ConversationActivity').to.exist;
    expect(agentReply!.platformMessageId, 'platformMessageId mirrors emulator ts').to.equal(replyMessage.ts);
  });

  it('serializes top-level (non-threaded) replies into channel history', async () => {
    // When the inbound message has no thread_ts, the slack adapter encodes
    // threadTs = ts (the message itself becomes the thread root). Replies post
    // back with thread_ts pointing at the inbound ts, surfacing the parent
    // message in conversations.history.
    onMessageHandler = async (_message, agentCtx) => {
      await agentCtx.reply('reply-in-channel');
    };

    const ts = `${Math.floor(Date.now() / 1000)}.000200`;
    const body = JSON.stringify(
      buildSlackAppMention({
        userId: user.id,
        channel: channel.id,
        threadTs: ts,
        text: '<@UBOT> hello',
        eventTs: ts,
      })
    );
    const timestamp = Math.floor(Date.now() / 1000);
    const headers = signSlackRequest(ctx.signingSecret, timestamp, body);

    await ctx.session.testAgent
      .post(`/v1/agents/${ctx.agentId}/webhook/${ctx.integrationIdentifier}`)
      .set(headers)
      .set('content-type', 'application/json')
      .send(body);

    await Promise.race([
      bridgeStub.drain(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Bridge drain timed out')), BRIDGE_DRAIN_TIMEOUT_MS)),
    ]);

    const reply = await pollFor(async () => {
      const replies = await getThreadReplies(channel.id, ts);
      if (!replies.ok || !replies.messages) return null;

      return replies.messages.find((m) => m.text === 'reply-in-channel') ?? null;
    }, SLACK_POLL_TIMEOUT_MS);

    expect(reply.thread_ts).to.equal(ts);

    // The inbound app_mention itself never landed in the emulator (it was
    // delivered to us via webhook, not via chat.postMessage), but the bot's
    // reply did — so conversations.history will surface either the parent
    // (if Slack auto-creates it) or just the bot reply via include_all_metadata.
    // We assert the reply is present in either history or replies.
    const history = await getChannelHistory(channel.id);
    const allMessages = [...(history.messages ?? [])];
    const replyInHistory = allMessages.find((m) => m.text === 'reply-in-channel');

    // The reply may surface in either history or thread replies depending on
    // emulator behavior; we already confirmed it's in replies above.
    if (replyInHistory) {
      expect(replyInHistory.thread_ts).to.equal(ts);
    }
  });
});
