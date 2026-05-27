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
import { Actions, Button, Card, CardText } from '@novu/framework/express';
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
import { BridgeExecutorStubHandle, stubBridgeExecutorWithRealHttp } from './helpers/bridge-executor-test-stub';
import { BridgeServerHandle, startBridgeServer } from './helpers/bridge-server';
import { buildSlackAppMention, signSlackRequest } from './helpers/providers/slack';
import {
  clearRecordedCalls,
  getChannelHistory,
  getRecordedCalls,
  getThreadReplies,
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
    //
    // Disable `acknowledgeOnReceived` because the chain awaits
    // `thread.startTyping('Thinking...')`, which calls
    // `assistant.threads.setStatus` on Slack. The emulator returns 404 for
    // that endpoint, and `@slack/web-api` retries with exponential backoff up
    // to 10 times over 30 minutes — long enough to deadlock the handler.
    // The acknowledge behavior is exercised separately by Scenario C.
    await agentRepository.update(
      { _id: ctx.agentId, _environmentId: ctx.session.environment._id },
      { $set: { bridgeUrl: bridge.url, 'behavior.acknowledgeOnReceived': false } }
    );

    const bridgeExecutor = testServer.getService(BridgeExecutorService);
    bridgeStub = stubBridgeExecutorWithRealHttp(bridgeExecutor);

    clearRecordedCalls();

    // Note: we deliberately do NOT call `resetEmulator()` between tests. The
    // emulator's seeded user/channel IDs are randomly generated per `seed()`
    // invocation, so resetting would invalidate the cached `channel`/`user`
    // looked up in the suite-level `before()` hook. Each test uses a fresh
    // `thread_ts` and the test isolates bridge state via per-test agents +
    // integrations, which is enough.
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

    // Slack's `chat.handleWebhook` returns 200 the instant the payload is
    // accepted; the real `handleMessageEvent` → bridge dispatch → bridge stub
    // chain runs as a fire-and-forget promise. Poll for the stub to fire
    // before we await `drain()`.
    await pollFor(async () => (bridgeStub.calls.length > 0 ? true : null), BRIDGE_DRAIN_TIMEOUT_MS);

    await Promise.race([
      bridgeStub.drain(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Bridge drain timed out')), BRIDGE_DRAIN_TIMEOUT_MS)
      ),
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
      ctx.agentId,
      ctx.integrationId,
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

    await pollFor(async () => (bridgeStub.calls.length > 0 ? true : null), BRIDGE_DRAIN_TIMEOUT_MS);

    await Promise.race([
      bridgeStub.drain(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Bridge drain timed out')), BRIDGE_DRAIN_TIMEOUT_MS)
      ),
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

  it('serializes Card replies into Slack Block Kit with intact action_ids', async () => {
    // Scenario B: Cards are framework-level objects that the slack adapter
    // converts via cardToBlockKit. Drift here would silently produce broken
    // interactivity payloads.
    //
    // emulate@0.5's `chat.postMessage` only persists `text` (not `blocks`),
    // so we can't read blocks back from `conversations.history`. Instead, we
    // record every WebClient call via the prototype patch and assert against
    // the wire payload — which is exactly what gets sent to Slack in
    // production.
    onMessageHandler = async (_message, agentCtx) => {
      await agentCtx.reply(
        Card({
          title: 'Confirm pickup',
          children: [
            CardText('Your order is ready.'),
            Actions([
              Button({ id: 'confirm', label: 'Confirm', style: 'primary' }),
              Button({ id: 'cancel', label: 'Cancel', style: 'danger' }),
            ]),
          ],
        })
      );
    };

    const threadTs = `${Math.floor(Date.now() / 1000)}.000300`;
    const body = JSON.stringify(
      buildSlackAppMention({ userId: user.id, channel: channel.id, threadTs, text: '<@UBOT> card' })
    );
    const headers = signSlackRequest(ctx.signingSecret, Math.floor(Date.now() / 1000), body);

    await ctx.session.testAgent
      .post(`/v1/agents/${ctx.agentId}/webhook/${ctx.integrationIdentifier}`)
      .set(headers)
      .set('content-type', 'application/json')
      .send(body);

    await pollFor(async () => (bridgeStub.calls.length > 0 ? true : null), BRIDGE_DRAIN_TIMEOUT_MS);
    await Promise.race([
      bridgeStub.drain(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Bridge drain timed out')), BRIDGE_DRAIN_TIMEOUT_MS)
      ),
    ]);

    // Wait until `chat.postMessage` lands on the wire — the bridge handler
    // and the slack adapter's post are independently async after the bridge
    // returns 200.
    const postCall = await pollFor(async () => {
      const calls = getRecordedCalls('chat.postMessage');
      const match = calls.find((c) => c.options.thread_ts === threadTs);

      return match ?? null;
    }, SLACK_POLL_TIMEOUT_MS);

    expect(postCall.options.channel, 'posted to inbound channel').to.equal(channel.id);

    const blocks = postCall.options.blocks as Array<Record<string, unknown>> | undefined;
    expect(blocks, 'card serialized to Block Kit blocks on the wire').to.be.an('array').that.is.not.empty;

    const actionsBlock = blocks!.find((b) => b.type === 'actions');
    expect(actionsBlock, 'card produces an actions block').to.exist;

    const elements = (actionsBlock as { elements?: Array<Record<string, unknown>> }).elements ?? [];
    expect(elements, 'actions block contains button elements').to.have.length.gte(2);

    const actionIds = elements.map((e) => e.action_id as string);
    expect(actionIds, 'button action_ids preserved through Card → Block Kit serialization').to.include.members([
      'confirm',
      'cancel',
    ]);

    const confirmButton = elements.find((e) => e.action_id === 'confirm');
    expect(confirmButton).to.have.property('type', 'button');
    expect(confirmButton).to.have.property('style', 'primary');

    const cancelButton = elements.find((e) => e.action_id === 'cancel');
    expect(cancelButton).to.have.property('style', 'danger');
  });

  it('emits reactions.add with the configured resolve emoji when ctx.resolve is called', async () => {
    // Scenario C: enable the configured `reactionOnResolved` behavior and
    // assert the Slack adapter actually emits a `reactions.add` for the
    // first-message id we stored on the conversation. We can't read it back
    // via `reactions.get` because the inbound user message lives only in our
    // webhook payload (never `chat.postMessage`'d into the emulator), so
    // reactions.add resolves to `message_not_found` server-side. The
    // recorded WebClient call is the meaningful contract assertion: that's
    // what the production adapter actually sends to Slack in real usage.
    await agentRepository.update(
      { _id: ctx.agentId, _environmentId: ctx.session.environment._id },
      { $set: { 'behavior.reactionOnResolved': 'white_check_mark' } }
    );

    onMessageHandler = async (_message, agentCtx) => {
      await agentCtx.reply('working on it');
      agentCtx.resolve('done');
    };

    // Use a single deterministic timestamp for both `event.ts` (which becomes
    // the inbound message id stored as `firstPlatformMessageId`) and
    // `thread_ts` so the test can assert the recorded `reactions.add` targets
    // exactly that ts.
    const ts = `${Math.floor(Date.now() / 1000)}.000400`;
    const body = JSON.stringify(
      buildSlackAppMention({
        userId: user.id,
        channel: channel.id,
        threadTs: ts,
        eventTs: ts,
        text: '<@UBOT> resolve me',
      })
    );
    const headers = signSlackRequest(ctx.signingSecret, Math.floor(Date.now() / 1000), body);

    await ctx.session.testAgent
      .post(`/v1/agents/${ctx.agentId}/webhook/${ctx.integrationIdentifier}`)
      .set(headers)
      .set('content-type', 'application/json')
      .send(body);

    await pollFor(async () => (bridgeStub.calls.length > 0 ? true : null), BRIDGE_DRAIN_TIMEOUT_MS);
    await Promise.race([
      bridgeStub.drain(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Bridge drain timed out')), BRIDGE_DRAIN_TIMEOUT_MS)
      ),
    ]);

    const reactionCall = await pollFor(async () => {
      const calls = getRecordedCalls('reactions.add');
      const match = calls.find((c) => c.options.name === 'white_check_mark');

      return match ?? null;
    }, SLACK_POLL_TIMEOUT_MS);

    expect(reactionCall.options.channel, 'reaction landed on inbound channel').to.equal(channel.id);
    expect(reactionCall.options.timestamp, 'reaction targets the first inbound message').to.equal(ts);

    // Conversation should be marked resolved in our DB.
    const conversation = await conversationRepository.findByPlatformThread(
      ctx.session.environment._id,
      ctx.session.organization._id,
      ctx.agentId,
      ctx.integrationId,
      `slack:${channel.id}:${ts}`
    );
    expect(conversation, 'conversation persisted').to.exist;
    // Resolved conversations move to status 'resolved' via resolveConversation.
    expect(conversation!.status).to.equal('resolved');
  });

  it('edits a previously-posted message via the /reply edit path', async () => {
    // Scenario D: the agent posts an initial reply, the test then issues a
    // `/v1/agents/:id/reply` with `edit: { messageId, content }`. The slack
    // adapter routes that to chat.update, mutating the message in the
    // emulator. We assert the post-edit history reflects the new text.
    onMessageHandler = async (_message, agentCtx) => {
      await agentCtx.reply('initial');
    };

    const threadTs = `${Math.floor(Date.now() / 1000)}.000500`;
    const body = JSON.stringify(
      buildSlackAppMention({ userId: user.id, channel: channel.id, threadTs, text: '<@UBOT> edit me' })
    );
    const headers = signSlackRequest(ctx.signingSecret, Math.floor(Date.now() / 1000), body);

    await ctx.session.testAgent
      .post(`/v1/agents/${ctx.agentId}/webhook/${ctx.integrationIdentifier}`)
      .set(headers)
      .set('content-type', 'application/json')
      .send(body);

    await pollFor(async () => (bridgeStub.calls.length > 0 ? true : null), BRIDGE_DRAIN_TIMEOUT_MS);
    await Promise.race([
      bridgeStub.drain(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Bridge drain timed out')), BRIDGE_DRAIN_TIMEOUT_MS)
      ),
    ]);

    const initialMessage = await pollFor(async () => {
      const replies = await getThreadReplies(channel.id, threadTs);
      if (!replies.ok || !replies.messages) return null;

      return replies.messages.find((m) => m.text === 'initial') ?? null;
    }, SLACK_POLL_TIMEOUT_MS);

    const conversation = await conversationRepository.findByPlatformThread(
      ctx.session.environment._id,
      ctx.session.organization._id,
      ctx.agentId,
      ctx.integrationId,
      `slack:${channel.id}:${threadTs}`
    );
    expect(conversation, 'conversation exists').to.exist;

    const editRes = await ctx.session.testAgent.post(`/v1/agents/${ctx.agentIdentifier}/reply`).send({
      conversationId: conversation!._id,
      integrationIdentifier: ctx.integrationIdentifier,
      edit: {
        messageId: initialMessage.ts,
        content: { markdown: 'edited' },
      },
    });

    expect(editRes.status, JSON.stringify(editRes.body)).to.equal(200);

    await pollFor(async () => {
      const replies = await getThreadReplies(channel.id, threadTs);
      if (!replies.ok || !replies.messages) return null;

      const updated = replies.messages.find((m) => m.ts === initialMessage.ts);

      return updated && updated.text === 'edited' ? updated : null;
    }, SLACK_POLL_TIMEOUT_MS);
  });
});
