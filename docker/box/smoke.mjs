#!/usr/bin/env node
// End-to-end smoke test for a running Novu Box, run from outside the box:
//
//   node --env-file=docker/box/.env docker/box/smoke.mjs [artifact-dir]
//
// Signs in as the seeded user, creates an in-app workflow, opens a realtime
// socket as a subscriber, triggers the workflow, then checks that the
// notification reached the activity feed (Mongo), the workflow-run log
// (ClickHouse), the subscriber's inbox, the socket (socket worker) and Mailpit
// (SMTP), runs a delay step through the queue backend (SQS), then uploads a file
// through a presigned S3 URL.
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
  await check('create in-app workflow', async () => {
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
      body: JSON.stringify({ name: workflowId, to: { subscriberId, email }, payload: { n: 1 } }),
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
    const put = await fetch(body.data.signedUrl, { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: bytes });
    if (!put.ok) throw new Error(`PUT -> ${put.status}: ${(await put.text()).slice(0, 200)}`);
    const get = await fetch(body.data.path);
    if (!get.ok) throw new Error(`GET ${body.data.path} -> ${get.status}`);

    return { path: body.data.path, bytes: (await get.arrayBuffer()).byteLength };
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
