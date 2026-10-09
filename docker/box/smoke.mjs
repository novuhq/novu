#!/usr/bin/env node
// End-to-end smoke test for a running Novu Box, run from outside the box:
//
//   node --env-file=docker/box/.env docker/box/smoke.mjs [artifact-dir]
//
// Signs in as the seeded user, creates an in-app workflow, opens a realtime
// socket as a subscriber, triggers the workflow, then checks that the
// notification reached the activity feed (Mongo), the workflow-run log
// (ClickHouse), the subscriber's inbox, the socket (socket worker) and Mailpit
// (SMTP), checks SMS, push and chat reached the sink (shown in Mailpit), runs a
// delay step through the queue backend (SQS), uploads a file through a
// presigned S3 URL, then runs the bridge app's code-first workflows
// (@novu/framework): sync, preview, every channel, skip, delay with a custom
// step, digest, throttle, Local mode discovery and the bridge URL guard, and
// chats with its agents over web chat (cards, actions, metadata, tool
// approval, HITL approval, workflow trigger, resolve; custom code, AI SDK and LangChain).
// Writes smoke.json with every check and its timing into the artifact dir.

import fs from 'node:fs';
import { findSeedUser, SEED, seedUserToken } from './clerk.mjs';

const API = process.env.BOX_API_URL ?? 'http://localhost:13000';
const DASHBOARD = process.env.BOX_DASHBOARD_URL ?? 'http://localhost:14200';
const SOCKET = process.env.BOX_SOCKET_URL ?? 'ws://localhost:18887';
const MAIL = process.env.BOX_MAIL_URL ?? 'http://localhost:18025';
const OUT = process.argv[2] ?? `.scratch/box-run/smoke-${Date.now()}`;
const TIMEOUT_MS = 60_000;

const checks = [];
const started = Date.now();

async function check(name, fn) {
  const t0 = Date.now();
  try {
    const detail = await fn();
    checks.push({ name, ok: true, ms: Date.now() - t0, detail });
    console.log(`ok   ${name} (${Date.now() - t0} ms)`);

    return detail;
  } catch (error) {
    checks.push({ name, ok: false, ms: Date.now() - t0, error: error.message });
    console.log(`FAIL ${name}: ${error.message}`);
    throw error;
  }
}

async function call(path, { headers = {}, ...init } = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Origin: DASHBOARD, ...headers },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} -> ${res.status}: ${text.slice(0, 300)}`);

  return { res, body: text ? JSON.parse(text) : null };
}

async function until(name, fn) {
  const deadline = Date.now() + TIMEOUT_MS;
  let last;
  while (Date.now() < deadline) {
    last = await fn().catch((error) => ({ error }));
    if (last && !last.error) return last;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`${name} not reached in ${TIMEOUT_MS / 1000}s: ${last?.error?.message ?? 'no data'}`);
}

let exitCode = 0;
try {
  await check('dashboard serves index.html with runtime env', async () => {
    const html = await (await fetch(DASHBOARD)).text();
    if (!html.includes('window._env_')) throw new Error('window._env_ missing');
    const box = await (await fetch(`${DASHBOARD}/__box.json`)).json();

    return { baked: box.baked?.sha, applied: box.applied?.sha ?? null };
  });
  await check('api health', async () => (await call('/v1/health-check')).body.data?.status);
  await check('socket worker health', async () => {
    const res = await fetch(`${SOCKET.replace(/^ws/, 'http')}/health`);
    if (!res.ok) throw new Error(`status ${res.status}`);

    return res.status;
  });

  let token;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  await check('sign in as seeded user (Clerk)', async () => {
    const { user, org } = await findSeedUser();
    if (!org) throw new Error(`${SEED.email} or ${SEED.orgName} missing in Clerk; bake the box first`);
    token = await seedUserToken({ userId: user.id, orgId: org.id });
    const { body } = await call('/v1/organizations/me', { headers: auth() });

    return { organization: body.data.name, organizationId: body.data._id };
  });
  await check('seeded org is on Team (Stripe)', async () => {
    const { body } = await call('/v1/billing/subscription', { headers: auth() });
    const { apiServiceLevel, status } = body.data;
    if (apiServiceLevel !== 'business' || status !== 'active') throw new Error(`${apiServiceLevel}/${status}`);

    return { apiServiceLevel, status };
  });

  const env = await check('read Development environment', async () => {
    const envs = await call('/v1/environments', { headers: auth() });
    const dev = envs.body.data.find((item) => item.name === 'Development');

    return { id: dev._id, identifier: dev.identifier, apiKey: dev.apiKeys[0].key };
  });
  const keyAuth = { Authorization: `ApiKey ${env.apiKey}` };
  checks.at(-1).detail = { id: env.id, identifier: env.identifier };

  const workflowId = `box-smoke-${Date.now()}`;
  await check('create workflow (in-app, email, SMS, push, chat)', async () => {
    await call('/v2/workflows', {
      method: 'POST',
      headers: keyAuth,
      body: JSON.stringify({
        name: workflowId,
        workflowId,
        __source: 'dashboard',
        steps: [
          { name: 'In-App', type: 'in_app', controlValues: { body: 'Box smoke {{payload.n}}' } },
          {
            name: 'Email',
            type: 'email',
            controlValues: { subject: 'Box smoke {{payload.n}}', body: '<p>Box smoke email</p>', editorType: 'html' },
          },
          { name: 'SMS', type: 'sms', controlValues: { body: 'Box smoke SMS {{subscriber.subscriberId}}' } },
          {
            name: 'Push',
            type: 'push',
            controlValues: { subject: 'Box smoke push', body: 'Box smoke push {{subscriber.subscriberId}}' },
          },
          { name: 'Chat', type: 'chat', controlValues: { body: 'Box smoke chat {{subscriber.subscriberId}}' } },
        ],
      }),
    });

    return workflowId;
  });

  const subscriberId = `box-smoke-subscriber-${Date.now()}`;
  const email = `${subscriberId}@box.test`;
  const subscriberToken = await check('open inbox session', async () => {
    const session = await call('/v1/inbox/session', {
      method: 'POST',
      body: JSON.stringify({ applicationIdentifier: env.identifier, subscriberId }),
    });

    return session.body.data.token;
  });
  checks.at(-1).detail = { subscriberId };

  await check('give the subscriber a push token and a chat webhook', async () => {
    for (const [providerId, credentials] of [
      ['push-webhook', { deviceTokens: ['box-smoke-device'] }],
      ['chat-webhook', { webhookUrl: 'http://sink.box.internal:8026/chat' }],
    ]) {
      await call(`/v1/subscribers/${subscriberId}/credentials`, {
        method: 'PUT',
        headers: keyAuth,
        body: JSON.stringify({ providerId, credentials }),
      });
    }

    return 'push-webhook, chat-webhook';
  });

  const socketMessages = [];
  const socket = await check('connect realtime socket', async () => {
    const ws = new WebSocket(`${SOCKET}/?token=${subscriberToken}`);
    ws.addEventListener('message', (event) => socketMessages.push(String(event.data)));
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', () => reject(new Error('socket error')), { once: true });
    });

    return ws;
  });
  checks.at(-1).detail = 'open';

  const transactionId = await check('trigger workflow', async () => {
    const res = await call('/v1/events/trigger', {
      method: 'POST',
      headers: keyAuth,
      body: JSON.stringify({ name: workflowId, to: { subscriberId, email, phone: '+15550002' }, payload: { n: 1 } }),
    });

    return res.body.data.transactionId;
  });

  await check('activity feed shows the run (Mongo)', () =>
    until('activity entry', async () => {
      const { body } = await call(`/v1/notifications?page=0&transactionId=${transactionId}`, { headers: keyAuth });
      const item = body.data.find((entry) => entry.transactionId === transactionId);
      const job = item?.jobs?.find((entry) => entry.type === 'in_app');
      if (job?.status !== 'completed') throw new Error(`in_app job status ${job?.status}`);

      return { notificationId: item._id, jobStatus: job.status };
    })
  );

  await check('subscriber inbox has the message', () =>
    until('inbox message', async () => {
      const { body } = await call('/v1/inbox/notifications?limit=10', {
        headers: { Authorization: `Bearer ${subscriberToken}` },
      });
      const message = body.data.find((entry) => entry.body === 'Box smoke 1');
      if (!message) throw new Error(`${body.data.length} messages, none match`);

      return { messageId: message.id, body: message.body };
    })
  );

  await check('realtime event arrived over the socket worker', () =>
    until('socket event', async () => {
      const received = socketMessages.find((message) => message.includes('notification_received'));
      if (!received) throw new Error(`${socketMessages.length} socket messages`);

      return received.slice(0, 200);
    })
  );
  socket.close();

  await check('workflow-run log (ClickHouse)', () =>
    until('workflow run', async () => {
      const { body } = await call(`/v1/activity/workflow-runs?limit=10&transactionIds=${transactionId}`, {
        headers: { ...auth(), 'Novu-Environment-Id': env.id },
      });
      const run = body.data?.find((entry) => entry.transactionId === transactionId) ?? body.data?.[0];
      if (!run) throw new Error('no workflow runs yet');

      return { workflowRunId: run.id ?? run.workflowRunId, status: run.status };
    })
  );

  await check('email delivered to Mailpit (SMTP)', () =>
    until('email', async () => {
      const res = await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
      const { messages } = await res.json();
      if (!messages?.length) throw new Error('no email yet');

      return { subject: messages[0].Subject, from: messages[0].From?.Address };
    })
  );

  await check('SMS, push and chat reached the sink (Mailpit)', () =>
    until('sink messages', async () => {
      const found = {};
      for (const channel of ['sms', 'push', 'chat']) {
        const query = encodeURIComponent(`tag:${channel} "${subscriberId}"`);
        const { messages } = await (await fetch(`${MAIL}/api/v1/search?query=${query}`)).json();
        if (!messages?.length) throw new Error(`no ${channel} message yet`);
        found[channel] = messages[0].Subject;
      }

      return found;
    })
  );

  await check('delay step waits, then delivers (SQS)', async () => {
    const delayWorkflowId = `box-smoke-delay-${Date.now()}`;
    await call('/v2/workflows', {
      method: 'POST',
      headers: keyAuth,
      body: JSON.stringify({
        name: delayWorkflowId,
        workflowId: delayWorkflowId,
        __source: 'dashboard',
        steps: [
          { name: 'Wait', type: 'delay', controlValues: { type: 'regular', amount: 5, unit: 'seconds' } },
          { name: 'In-App', type: 'in_app', controlValues: { body: 'Box smoke after delay' } },
        ],
      }),
    });
    const triggeredAt = Date.now();
    const { body } = await call('/v1/events/trigger', {
      method: 'POST',
      headers: keyAuth,
      body: JSON.stringify({ name: delayWorkflowId, to: { subscriberId }, payload: {} }),
    });
    const delayTransactionId = body.data.transactionId;
    const jobs = async () => {
      const { body: activity } = await call(`/v1/notifications?page=0&transactionId=${delayTransactionId}`, {
        headers: keyAuth,
      });

      return activity.data.find((entry) => entry.transactionId === delayTransactionId)?.jobs ?? [];
    };
    const inAppDone = (list) => list.find((job) => job.type === 'in_app')?.status === 'completed';

    await new Promise((resolve) => setTimeout(resolve, 2000));
    if (inAppDone(await jobs())) throw new Error('in_app completed within 2 s, so the 5 s delay was skipped');

    return until('delayed in_app job', async () => {
      const list = await jobs();
      if (!inAppDone(list)) throw new Error(list.map((job) => `${job.type}:${job.status}`).join(' '));

      return { transactionId: delayTransactionId, waitedMs: Date.now() - triggeredAt };
    });
  });

  await check('upload through a presigned URL and read it back (S3)', async () => {
    const { body } = await call('/v1/storage/upload-url?extension=png', {
      headers: { ...auth(), 'Novu-Environment-Id': env.id },
    });
    const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const put = await fetch(body.data.signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/png' },
      body: bytes,
    });
    if (!put.ok) throw new Error(`PUT -> ${put.status}: ${(await put.text()).slice(0, 200)}`);
    const get = await fetch(body.data.path);
    if (!get.ok) throw new Error(`GET ${body.data.path} -> ${get.status}`);

    return { path: body.data.path, bytes: (await get.arrayBuffer()).byteLength };
  });

  // Code-first workflows from the bridge app (playground/nextjs), served by @novu/framework.
  const bridgeAuth = { ...auth(), 'Novu-Environment-Id': env.id };
  const run = `r${Date.now()}`;
  const triggerBridge = async (name, payload) =>
    (
      await call('/v1/events/trigger', {
        method: 'POST',
        headers: keyAuth,
        body: JSON.stringify({ name, to: { subscriberId, email, phone: '+15550002' }, payload }),
      })
    ).body.data.transactionId;
  const mailpit = async (query) =>
    (await (await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent(query)}`)).json()).messages ?? [];
  const inbox = async () =>
    (await call('/v1/inbox/notifications?limit=50', { headers: { Authorization: `Bearer ${subscriberToken}` } })).body
      .data;

  await check('bridge app is synced (framework)', async () => {
    const { body: status } = await call('/v1/bridge/status', { headers: bridgeAuth });
    if (status.data.status !== 'ok') throw new Error(`bridge status ${status.data.status}`);
    const { body } = await call('/v2/workflows?limit=50', { headers: keyAuth });
    const external = body.data.workflows
      .filter((workflow) => workflow.origin === 'external')
      .map((workflow) => workflow.workflowId);
    const expected = [
      'welcome-workflow',
      'all-channels-workflow',
      'delay-custom-workflow',
      'digest-workflow',
      'throttle-workflow',
    ];
    if (!expected.every((id) => external.includes(id))) throw new Error(`external workflows: ${external.join(', ')}`);

    return { sdkVersion: status.data.sdkVersion, discovered: status.data.discovered, workflows: external };
  });

  await check('bridge preview renders a code step with controls', async () => {
    const { body } = await call('/v1/bridge/preview/all-channels-workflow/email', {
      method: 'POST',
      headers: bridgeAuth,
      body: JSON.stringify({ controls: { subject: 'Preview' }, payload: { name: 'P' } }),
    });
    if (body.data.outputs.subject !== 'Preview P') throw new Error(`subject ${body.data.outputs.subject}`);

    return body.data.outputs;
  });

  await check('bridge workflow reaches every channel and skips push (signed)', async () => {
    const transaction = await triggerBridge('all-channels-workflow', { name: run, skipPush: true });

    return until('bridge deliveries', async () => {
      const [emailMessage] = await mailpit(`subject:"Bridge email ${run}"`);
      if (!emailMessage) throw new Error('no email yet');
      for (const channel of ['sms', 'chat']) {
        if (!(await mailpit(`tag:${channel} "${run}"`)).length) throw new Error(`no ${channel} yet`);
      }
      if (!(await inbox()).some((message) => message.body === `Bridge in-app for ${run}`))
        throw new Error('no in-app yet');
      const { body } = await call(`/v1/notifications?page=0&transactionId=${transaction}`, { headers: keyAuth });
      const jobs = body.data.find((entry) => entry.transactionId === transaction)?.jobs ?? [];
      // A step skipped by the bridge ends as a canceled job, and nothing reaches the provider.
      const push = jobs.find((job) => job.type === 'push')?.status;
      if (push !== 'canceled') throw new Error(`push job ${push}`);
      if ((await mailpit(`tag:push "${run}"`)).length) throw new Error('skipped push reached the sink');

      return { email: emailMessage.Subject, push };
    });
  });

  await check('bridge custom step output reaches an email after a delay', async () => {
    await triggerBridge('delay-custom-workflow', { name: run });
    const subject = `Bridge code CODE-${run.toUpperCase()}`;

    return until('custom output email', async () => {
      if (!(await mailpit(`subject:"${subject}"`)).length) throw new Error('no email yet');

      return subject;
    });
  });

  await check('bridge digest batches 3 triggers into 1 email', async () => {
    for (const n of [1, 2, 3]) await triggerBridge('digest-workflow', { run, n });

    return until('digest email', async () => {
      const messages = await mailpit(`subject:"Bridge digest ${run}"`);
      if (messages.length !== 1 || !messages[0].Subject.endsWith(': 3 events')) {
        throw new Error(messages.map((message) => message.Subject).join(' | ') || 'no digest email yet');
      }

      return messages[0].Subject;
    });
  });

  await check('Local mode discovers the bridge without syncing (stateless)', async () => {
    const { body } = await call('/v1/bridge/stateless/discover', {
      method: 'POST',
      headers: bridgeAuth,
      body: JSON.stringify({ bridgeUrl: 'http://bridge.box.internal:4000/api/novu' }),
    });

    return body.data.workflows.map((workflow) => workflow.workflowId);
  });

  await check('bridge URL guard rejects localhost', async () => {
    const { body } = await call('/v1/bridge/validate', {
      method: 'POST',
      headers: keyAuth,
      body: JSON.stringify({ bridgeUrl: 'http://localhost:4000/api/novu' }),
    });
    if (body.data.isValid !== false) throw new Error('localhost bridge URL accepted');

    return body.data.error;
  });

  // Self-hosted agents from the bridge app (playground/nextjs), chatting over web chat as the subscriber above.
  const subscriberAuth = { Authorization: `Bearer ${subscriberToken}` };
  const agentEvents = async (conversation) =>
    (
      await call(`/v1/web-chat/conversations/${conversation}/events?limit=100`, { headers: subscriberAuth })
    ).body.data.events.map((envelope) => envelope.event);
  const waitForEvent = (conversation, what, predicate) =>
    until(what, async () => {
      const event = (await agentEvents(conversation)).findLast(predicate);
      if (!event) throw new Error(`no ${what} yet`);

      return event;
    });
  // Sends a message or an action, then waits for the agent's reply, so turns never overlap.
  const chat = async (agentId, conversation, body, reply) => {
    const { body: sent } = await call('/v1/web-chat/conversations', {
      method: 'POST',
      headers: subscriberAuth,
      body: JSON.stringify({ agentId, ...(conversation ? { conversationIdentifier: conversation } : {}), ...body }),
    });
    const event = await waitForEvent(
      sent.data.identifier,
      `reply "${reply}"`,
      (item) =>
        item.type === 'message' &&
        item.role === 'assistant' &&
        (typeof reply === 'string' ? item.content?.markdown === reply : reply(item))
    );

    return { conversation: sent.data.identifier, event };
  };

  await check('agents are synced with the bridge URL (framework)', async () => {
    const urls = {};
    for (const agentId of ['custom-code-agent', 'ai-sdk-agent', 'langchain-agent']) {
      const { body } = await call(`/v1/agents/${agentId}`, { headers: keyAuth });
      if (body.data.bridgeUrl !== 'http://bridge.box.internal:4000/api/novu')
        throw new Error(`${agentId} bridgeUrl ${body.data.bridgeUrl}`);
      urls[agentId] = body.data.bridgeUrl;
    }

    return urls;
  });

  let customCode;
  await check('custom-code agent replies with a card (table, chart, buttons)', async () => {
    const { conversation, event } = await chat(
      'custom-code-agent',
      null,
      { text: 'card' },
      (item) => item.content?.card
    );
    customCode = conversation;
    const types = event.content.card.children.map((child) => child.type);
    for (const type of ['table', 'chart', 'link', 'actions'])
      if (!types.includes(type)) throw new Error(`card has ${types.join(', ')}`);
    await chat(
      'custom-code-agent',
      customCode,
      { actionId: 'pick', sourceMessageId: event.messageId, value: 'blue' },
      'Clicked pick = blue'
    );

    return { conversation, children: types, clicked: 'pick = blue' };
  });

  await check('custom-code agent keeps conversation metadata', async () => {
    await chat('custom-code-agent', customCode, { text: `remember ${run}` }, `Noted: ${run}`);
    await chat('custom-code-agent', customCode, { text: 'recall' }, `You asked me to remember: ${run}`);

    return run;
  });

  // Approve over web chat, the way the Inbox's approval card does: echo the server-minted action id.
  // The AI SDK and LangChain agents may run on Claude, so their prompt reads like a person's and the reply check is loose.
  const approveTool = async (agentId, text) => {
    const { body } = await call('/v1/web-chat/conversations', {
      method: 'POST',
      headers: subscriberAuth,
      body: JSON.stringify({ agentId, text }),
    });
    const conversation = body.data.identifier;
    const request = await waitForEvent(
      conversation,
      'tool approval request',
      (item) => item.type === 'tool-approval-request'
    );
    const { event } = await chat(agentId, conversation, { actionId: request.approveActionId }, (item) =>
      item.content?.markdown?.includes('21')
    );

    return { conversation, tool: request.toolName, input: request.input, reply: event.content.markdown };
  };

  await check('custom-code agent runs a tool after approval', () => approveTool('custom-code-agent', 'weather Paris'));

  await check('custom-code agent triggers a workflow for the subscriber', async () => {
    await chat('custom-code-agent', customCode, { text: `notify ${run}-agent` }, 'Triggered all-channels-workflow');

    return until('agent-triggered in-app', async () => {
      const message = (await inbox()).find((item) => item.body === `Bridge in-app for ${run}-agent`);
      if (!message) throw new Error('no in-app yet');

      return message.body;
    });
  });

  await check('custom-code agent resolves the conversation', async () => {
    await chat('custom-code-agent', customCode, { text: 'done' }, 'Resolving');

    return until('resolved conversation', async () => {
      const { body } = await call(`/v1/web-chat/conversations/${customCode}`, { headers: subscriberAuth });
      if (body.data.status !== 'resolved') throw new Error(`status ${body.data.status}`);

      return body.data.status;
    });
  });

  await check('AI SDK agent runs a tool after approval', () =>
    approveTool('ai-sdk-agent', 'What is the weather in Lima?')
  );
  await check('LangChain agent runs a tool after approval', () =>
    approveTool('langchain-agent', 'What is the weather in Oslo?')
  );

  // ctx.approve posts a card whose buttons carry `human:<id>:approve|deny`; the answer comes back on onAction.
  // HITL is only on the plain agent(): the AI SDK and LangChain adapters don't call the model again after it.
  const approveHuman = async (agentId, text, reply) => {
    const { body } = await call('/v1/web-chat/conversations', {
      method: 'POST',
      headers: subscriberAuth,
      body: JSON.stringify({ agentId, text }),
    });
    const conversation = body.data.identifier;
    const card = await waitForEvent(conversation, 'approval card', (item) =>
      JSON.stringify(item.content?.card ?? {}).includes(':approve"')
    );
    await waitForEvent(conversation, 'end of the turn', (item) => item.type === 'run-finish');
    const before = new Set((await agentEvents(conversation)).map((item) => item.messageId));
    const approveId = card.content.card.children
      .flatMap((child) => child.children ?? [])
      .find((button) => button.id?.endsWith(':approve')).id;
    const { event } = await chat(
      agentId,
      conversation,
      { actionId: approveId, sourceMessageId: card.messageId },
      (item) => !before.has(item.messageId) && reply(item)
    );

    return { conversation, card: card.content.card.title, reply: event.content.markdown };
  };

  await check('custom-code agent continues after a HITL approval', () =>
    approveHuman(
      'custom-code-agent',
      'approve',
      (item) => item.content?.markdown === 'Got it — approve is **approved** (approve).'
    )
  );

  // The managed agent exists only on a box started with NOVU_MANAGED_CLAUDE_API_KEY, which also puts the AI SDK
  // and LangChain agents on Claude. Without it they run on scripted models that only know the weather tool.
  const withClaude = await call('/v1/agents/box-managed', { headers: keyAuth }).then(
    () => true,
    () => false
  );
  if (withClaude) {
    for (const [agentId, name] of [
      ['ai-sdk-agent', 'AI SDK'],
      ['langchain-agent', 'LangChain'],
    ]) {
      await check(`${name} agent shows a card through a tool (Claude)`, async () => {
        const { conversation } = await chat(
          agentId,
          null,
          { text: 'Show me the demo card' },
          (item) => item.content?.card?.title === 'Demo card'
        );

        return { conversation };
      });
    }
  }

  if (withClaude) {
    const managedReply = (text) => (item) => item.content?.markdown?.includes(text);
    await check('managed agent replies (Claude Haiku through thalamus)', async () => {
      const { conversation, event } = await chat(
        'box-managed',
        null,
        { text: 'Reply with exactly: BOX-OK' },
        managedReply('BOX-OK')
      );

      return { conversation, reply: event.content.markdown };
    });

    await check('managed agent runs bash after approval', async () => {
      const { body } = await call('/v1/web-chat/conversations', {
        method: 'POST',
        headers: subscriberAuth,
        body: JSON.stringify({
          agentId: 'box-managed',
          text: 'Use the bash tool to run: echo BOX-$((6*7)) Then reply with only its output.',
        }),
      });
      const conversation = body.data.identifier;
      const request = await waitForEvent(
        conversation,
        'tool approval request',
        (item) => item.type === 'tool-approval-request'
      );
      await chat('box-managed', conversation, { actionId: request.approveActionId }, managedReply('BOX-42'));

      return { conversation, tool: request.toolName, input: request.input };
    });

    await check('managed agent counts against the demo quota', async () => {
      const { body } = await call('/v1/agents/box-managed/demo-quota', { headers: bridgeAuth });
      if (!body.data?.conversations?.count) throw new Error(`quota ${JSON.stringify(body.data)}`);

      return body.data.conversations;
    });
  } else {
    console.log('skip managed agent checks: no box-managed agent (start the box with NOVU_MANAGED_CLAUDE_API_KEY)');
  }

  // Last: RedisThrottleService loads its Lua script on one Redis Cluster node only, so this fails whenever the
  // throttle key lands on a node without it (FIDELITY.md, "Bugs found").
  await check('bridge throttle lets 1 of 2 triggers through', async () => {
    for (const n of [1, 2]) await triggerBridge('throttle-workflow', { run, n });
    const throttled = async () =>
      (await inbox()).filter((message) => message.body.startsWith(`Bridge throttle ${run}`));
    await until('first throttle message', async () => {
      const messages = await throttled();
      if (!messages.length) throw new Error('no in-app yet');

      return messages;
    });
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const delivered = (await throttled()).map((message) => message.body);
    if (delivered.length !== 1) throw new Error(`delivered ${delivered.join(', ')}`);

    return delivered;
  });
} catch {
  exitCode = 1;
}

fs.mkdirSync(OUT, { recursive: true });
const summary = {
  at: new Date().toISOString(),
  api: API,
  ok: checks.every((item) => item.ok),
  passed: checks.filter((item) => item.ok).length,
  total: checks.length,
  seconds: (Date.now() - started) / 1000,
  checks,
};
fs.writeFileSync(`${OUT}/smoke.json`, JSON.stringify(summary, null, 2));
console.log(`${summary.passed}/${summary.total} checks passed in ${summary.seconds}s -> ${OUT}/smoke.json`);
process.exit(exitCode);
