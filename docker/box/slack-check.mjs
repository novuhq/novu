#!/usr/bin/env node
// Checks that Novu Bot's Slack events reach the right cloud box and agent through the Slack router, with two boxes
// running, from outside:
//
//   node docker/box/slack-check.mjs <box> <other box> [artifact-dir]
//
// It sends the router what Slack would send for one person (BOX_SLACK_CHECK_USER) in #novu-box, signed with Novu
// Bot's signing secret (~/.config/novu-box/slack.env), and reads which events each box got from its /__box/state
// (signed in with `gh auth token`). Each thread starts from a message the bot posts, so the agents' replies land
// in it. Checks: /novu-box lists both boxes; a mention goes to the box and agent the person picked; a reply stays
// with its thread's box after they pick the other one; a mention in that reply arrives once; and the other box,
// put to sleep, gets a reply in its thread once it wakes. Writes slack-check.json into the artifact dir.

import { spawnSync } from 'node:child_process';
import { createHmac, randomBytes, randomInt } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';

const [A, B, OUT = `.scratch/box-run/slack-check-${Date.now()}`] = process.argv.slice(2);
if (!A || !B) {
  console.error('usage: node docker/box/slack-check.mjs <box> <other box> [artifact-dir]');
  process.exit(2);
}
const DOMAIN = process.env.BOX_CLOUD_DOMAIN ?? 'cli-shortener.workers.dev';
const ROUTER = `https://novu-box-slack.${DOMAIN}/slack`;
const CHANNEL = process.env.BOX_SLACK_CHANNEL ?? 'C0C9PHBUDR6';
// The TesterArmy guest in Novu's workspace.
const USER = process.env.BOX_SLACK_CHECK_USER ?? 'U0C8TDG9086';
const SLACK_ENV = process.env.BOX_SLACK_ENV ?? join(os.homedir(), '.config/novu-box/slack.env');
const secrets = Object.fromEntries(
  fs
    .readFileSync(SLACK_ENV, 'utf8')
    .split('\n')
    .map((line) => line.match(/^(?:export )?([A-Z0-9_]+)=["']?(.*?)["']?$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2]])
);
const GITHUB = process.env.GITHUB_TOKEN ?? spawnSync('gh', ['auth', 'token'], { encoding: 'utf8' }).stdout.trim();
const RUN = randomBytes(3).toString('hex');

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

// What Slack sends, signed as Slack signs it; the router has 3 s to answer.
async function send(body, contentType) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac('sha256', secrets.SLACK_SIGNING_SECRET).update(`v0:${timestamp}:${body}`).digest('hex');
  const t0 = Date.now();
  const response = await fetch(ROUTER, {
    method: 'POST',
    headers: {
      'content-type': contentType,
      'x-slack-request-timestamp': timestamp,
      'x-slack-signature': `v0=${signature}`,
    },
    body,
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`the router answered ${response.status}: ${text.slice(0, 200)}`);
  if (Date.now() - t0 > 3000) throw new Error(`the router took ${Date.now() - t0} ms; Slack waits 3 s`);

  return text ? JSON.parse(text) : null;
}

function command(text) {
  const form = { command: '/novu-box', text, user_id: USER, channel_id: CHANNEL, trigger_id: 'none' };

  return send(new URLSearchParams(form).toString(), 'application/x-www-form-urlencoded');
}

async function event(fields) {
  const id = `EvCheck${randomBytes(6).toString('hex')}`;
  const body = {
    type: 'event_callback',
    team_id: me.team_id,
    event_id: id,
    event_time: Math.floor(Date.now() / 1000),
    event: { channel: CHANNEL, user: USER, event_ts: fields.ts, ...fields },
  };
  await send(JSON.stringify(body), 'application/json');

  return id;
}

async function slack(method, params) {
  const response = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${secrets.SLACK_BOT_TOKEN}`, 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(params),
  });
  const body = await response.json();
  if (!body.ok) throw new Error(`${method}: ${body.error}`);

  return body;
}

async function thread(text) {
  return (await slack('chat.postMessage', { channel: CHANNEL, text: `slack-check ${RUN}: ${text}` })).ts;
}

// A reply's ts; the reply itself is never posted.
function replyTs() {
  return `${Math.floor(Date.now() / 1000)}.${String(randomInt(1e6)).padStart(6, '0')}`;
}

async function state(box) {
  const response = await fetch(`https://novu-box-${box}.${DOMAIN}/__box/state`, {
    headers: { Authorization: `Bearer ${GITHUB}` },
  });
  if (!response.headers.get('content-type')?.includes('json')) throw new Error(`novu-box-${box}: ${response.status}`);

  return response.json();
}

// The event as the box got it: from the right agent, and taken (2xx).
async function delivered(box, id, agent, { within = 60_000 } = {}) {
  const deadline = Date.now() + within;
  for (;;) {
    const got = (await state(box)).slackEvents.find((item) => item.id === id);
    if (got) {
      if (got.agent !== agent) throw new Error(`${box} got it for ${got.agent}, not ${agent}`);
      if (got.status >= 300) throw new Error(`${box} · ${agent} answered ${got.status}`);

      return got;
    }
    if (Date.now() > deadline) throw new Error(`${box} didn't get ${id} within ${within / 1000} s`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

async function notDelivered(id, boxes) {
  for (const box of boxes)
    if ((await state(box)).slackEvents.some((item) => item.id === id)) throw new Error(`${box} got ${id}`);
}

async function pick(box, agent) {
  const reply = await command(`${box} ${agent}`);
  if (!reply.text.includes(`*${box} · ${agent.replace(/-agent$/, '')}*`)) throw new Error(reply.text);
}

const me = await slack('auth.test', {});
const mention = `<@${me.user_id}>`;
const agents = {};
const threads = {};
let exitCode = 0;
try {
  await check('/novu-box lists both boxes, with action IDs unique in the message', async () => {
    const reply = await command('');
    const buttons = (reply.blocks ?? []).flatMap((block) => block.elements ?? []).filter((item) => item.value);
    const ids = (reply.blocks ?? []).flatMap((block) => block.elements ?? []).map((item) => item.action_id);
    if (new Set(ids).size !== ids.length) throw new Error(`repeated action IDs: ${ids.join(', ')}`);
    for (const button of buttons) {
      const { box, agent } = JSON.parse(button.value);
      agents[box] = [...(agents[box] ?? []), agent];
    }
    for (const box of [A, B]) if (!agents[box]?.length) throw new Error(`${box} isn't listed: ${reply.text}`);

    return agents;
  });

  for (const box of [A, B])
    await check(`a mention goes to the picked ${box} · ${agents[box][0]}`, async () => {
      await pick(box, agents[box][0]);
      threads[box] = await thread(`a thread for ${box} · ${agents[box][0]}`);
      const id = await event({ type: 'app_mention', ts: threads[box], text: `${mention} hi` });
      const got = await delivered(box, id, agents[box][0]);
      await notDelivered(
        id,
        [A, B].filter((other) => other !== box)
      );

      return got;
    });

  await check(`a reply in ${A}'s thread goes to ${A} while ${B} is picked`, async () => {
    const id = await event({ type: 'message', ts: replyTs(), thread_ts: threads[A], text: 'hi again' });
    const got = await delivered(A, id, agents[A][0]);
    await notDelivered(id, [B]);

    return got;
  });

  await check(`a mention in a reply in ${A}'s thread arrives once`, async () => {
    const ts = replyTs();
    const text = `${mention} hi once`;
    const message = await event({ type: 'message', ts, thread_ts: threads[A], text });
    const copy = await event({ type: 'app_mention', ts, thread_ts: threads[A], text });
    const got = await delivered(A, message, agents[A][0]);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await notDelivered(copy, [A, B]);

    return got;
  });

  await check(`${B}, asleep, gets a reply in its thread once it wakes`, async () => {
    const down = await fetch(`https://novu-box-${B}.${DOMAIN}/__box/down`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${GITHUB}` },
    });
    if (!down.ok) throw new Error(`down: ${down.status}`);
    const deadline = Date.now() + 15 * 60_000;
    while ((await state(B)).running) {
      if (Date.now() > deadline) throw new Error(`${B} is still saving after 15 minutes`);
      await new Promise((resolve) => setTimeout(resolve, 10_000));
    }
    const sent = Date.now();
    const id = await event({ type: 'message', ts: replyTs(), thread_ts: threads[B], text: 'are you awake?' });
    const got = await delivered(B, id, agents[B][0], { within: 8 * 60_000 });

    return { ...got, wokeInSeconds: Math.round((Date.now() - sent) / 1000) };
  });
} catch {
  exitCode = 1;
}

fs.mkdirSync(OUT, { recursive: true });
const summary = {
  at: new Date().toISOString(),
  boxes: [A, B],
  ok: checks.every((item) => item.ok),
  passed: checks.filter((item) => item.ok).length,
  total: checks.length,
  seconds: (Date.now() - started) / 1000,
  checks,
};
fs.writeFileSync(`${OUT}/slack-check.json`, JSON.stringify(summary, null, 2));
console.log(`${summary.passed}/${summary.total} checks passed in ${summary.seconds}s -> ${OUT}/slack-check.json`);
process.exit(exitCode);
