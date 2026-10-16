#!/usr/bin/env node
// Novu Box per pull request, run by .github/workflows/novu-box.yml (README, "Per pull request"). Plain Node, no npm
// dependencies. It drives boxes as `cli.mjs --cloud` does (cloud/target.mjs), signed in with the workflow's GitHub
// Actions OIDC token, and has the host create and delete their Workers (cloud/boxes.js), so the workflow holds no
// secret. Run by hand, it signs in with GITHUB_TOKEN or `gh auth token` instead.
//
//   node docker/box/ci.mjs pr       the pull_request event in GITHUB_EVENT_PATH: start the PR's box
//                                                pr-<number> from base and apply the PR's head, or delete the box;
//                                                one sticky PR comment says how it went
//   node docker/box/ci.mjs cleanup  delete pr-* boxes whose PR is closed or no longer labeled `box`
//   node docker/box/ci.mjs rebake   bake base again from next and save it to its snapshot

import fs from 'node:fs';
import { OIDC_AUDIENCE } from './cloud/auth.mjs';
import { BOX_CLI, boxWorker, detached } from './cloud/shared.mjs';
import { cloudTarget, DOMAIN, hostBoxes } from './cloud/target.mjs';
import { githubToken } from './node.mjs';

const REPO = process.env.GITHUB_REPOSITORY ?? 'novuhq/novu';
const LABEL = 'box';
const MAX_BOXES = 30;
// The longest an apply may take: a full one (install, every build) takes about 6 minutes.
const APPLY_MINUTES = 20;
// How long the box may take to pass its doctor after an apply restarted its apps.
const SETTLE_SECONDS = 3 * 60;
const MARK = '<!-- novu-box -->';
const RUN_URL =
  process.env.GITHUB_RUN_ID && `${process.env.GITHUB_SERVER_URL}/${REPO}/actions/runs/${process.env.GITHUB_RUN_ID}`;
const started = Date.now();
// Every wait ends by then, so the run can still say why in the comment: 5 minutes before the job's timeout-minutes
// (60, .github/workflows/novu-box.yml) ends it. The worst case (a save to wait out, a bake, a full apply) takes longer.
const DEADLINE = started + 55 * 60_000;

function log(message) {
  console.error(`[box] ${message}`);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- tokens ---

// What the host and the boxes accept from this run (cloud/auth.mjs): the workflow's OIDC token, fetched again a
// minute before it expires; run by hand, the GitHub token.
let oidc;

async function boxToken() {
  const { ACTIONS_ID_TOKEN_REQUEST_URL: url, ACTIONS_ID_TOKEN_REQUEST_TOKEN: requestToken } = process.env;
  if (!url) return githubToken();
  if (oidc && oidc.exp - 60 > Date.now() / 1000) return oidc.value;
  const response = await fetch(`${url}&audience=${OIDC_AUDIENCE}`, {
    headers: { Authorization: `Bearer ${requestToken}` },
  });
  if (!response.ok)
    throw new Error(`the OIDC token request answered ${response.status}; the job needs id-token: write`);
  const { value } = await response.json();
  oidc = { value, exp: JSON.parse(Buffer.from(value.split('.')[1], 'base64url')).exp };

  return value;
}

function target(box) {
  return cloudTarget({ box, log, githubToken: boxToken, mayDeployHost: false, deadline: DEADLINE });
}

// --- GitHub ---

async function github(path, init = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${githubToken()}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'novu-box',
      ...(init.body && { 'Content-Type': 'application/json' }),
    },
  });
  if (!response.ok)
    throw new Error(
      `GitHub ${init.method ?? 'GET'} ${path} -> ${response.status}: ${(await response.text()).slice(0, 200)}`
    );

  return response.json();
}

async function everyPage(path) {
  const items = [];
  for (let page = 1; ; page++) {
    const batch = await github(`${path}?per_page=100&page=${page}`);
    items.push(...batch);
    if (batch.length < 100) return items;
  }
}

// The one comment the box keeps on its PR, edited in place. `onlyUpdate`: say nothing on a PR that has none.
const commentIds = new Map();

async function comment(number, body, { onlyUpdate = false } = {}) {
  console.log(`comment on #${number}:\n${body}`);
  if (!commentIds.has(number)) {
    const existing = (await everyPage(`/repos/${REPO}/issues/${number}/comments`)).find((item) =>
      item.body?.startsWith(MARK)
    );
    commentIds.set(number, existing?.id);
  }
  const id = commentIds.get(number);
  const payload = { method: id ? 'PATCH' : 'POST', body: JSON.stringify({ body: `${MARK}\n${body}` }) };
  if (id) await github(`/repos/${REPO}/issues/comments/${id}`, payload);
  else if (!onlyUpdate) commentIds.set(number, (await github(`/repos/${REPO}/issues/${number}/comments`, payload)).id);
}

// Who added the `box` label: the sender of a `labeled` event, else whoever labeled the PR last.
async function labeler(event) {
  if (event.action === 'labeled') return event.sender.login;
  const events = await everyPage(`/repos/${REPO}/issues/${event.number}/events`);

  return events.filter((item) => item.event === 'labeled' && item.label?.name === LABEL).at(-1)?.actor?.login;
}

// Write, maintain or admin on the repository (GitHub reports maintain as `write`).
async function canWrite(login) {
  if (!login) return false;
  const { permission } = await github(`/repos/${REPO}/collaborators/${encodeURIComponent(login)}/permission`).catch(
    (error) => {
      if (/-> 404:/.test(error.message)) return { permission: 'none' };
      throw error;
    }
  );

  return permission === 'admin' || permission === 'write';
}

// --- pr ---

async function pr() {
  const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const { action, number, pull_request: pull } = event;
  const labeled = pull.labels.some((label) => label.name === LABEL);
  if (['labeled', 'unlabeled'].includes(action) ? event.label.name !== LABEL : !labeled && action !== 'closed') {
    log(`#${number} ${action}: nothing for the box to do`);

    return 0;
  }
  const box = `pr-${number}`;
  if (action === 'closed' || action === 'unlabeled') {
    await target(box).delete();
    const why = action === 'closed' ? 'the PR was closed' : `\`${LABEL}\` was removed`;
    await comment(number, `🗑️ Novu Box \`${box}\` deleted: ${why}.`, { onlyUpdate: true });

    return 0;
  }
  if (pull.state !== 'open') {
    log(`#${number} ${action}: the PR is ${pull.state}`);

    return 0;
  }
  const by = await labeler(event);
  if (!(await canWrite(by))) {
    await comment(
      number,
      `🚫 No Novu Box: ${by ? `@${by}` : 'whoever'} added \`${LABEL}\` without write access to ${REPO}. While we battle-test boxes, only Novu members with write access can start one.`
    );

    return 0;
  }

  return applyHead(number, pull.head.sha);
}

async function applyHead(number, sha) {
  const box = `pr-${number}`;
  const short = sha.slice(0, 10);
  const origin = `https://${boxWorker(box)}.${DOMAIN}`;
  const runLink = RUN_URL ? ` ([log](${RUN_URL}))` : '';
  const cloud = target(box);
  await comment(number, `⏳ Applying \`${short}\` to Novu Box \`${box}\`…${runLink}`);
  try {
    const phase = (await cloud.state())?.phase ?? 'new';
    // Never started, created by a run cancelled before the box first came up, its bake failed, or its snapshot is lost.
    if (['new', 'lost'].includes(phase)) {
      const { boxes } = await hostBoxes('boxes', { githubToken: boxToken, log });
      const others = boxes.filter((name) => /^pr-\d+$/.test(name) && name !== box);
      if (others.length >= MAX_BOXES) {
        await comment(
          number,
          `⏸️ No Novu Box: ${others.length} PR boxes exist, and ${MAX_BOXES} is the most at once. Remove \`${LABEL}\` from a PR you're done with, then remove and add \`${LABEL}\` here again.`
        );

        return 0;
      }
      await cloud.up({ fromBase: true });
    } else {
      // Waits out a save; a box that runs answers its doctor, whatever the doctor finds.
      await cloud.ready({ reachable: true });
      await stopApply(cloud);
    }
    const plan = await apply(cloud, sha);
    const report = await cloud.settled(Math.min(SETTLE_SECONDS, (DEADLINE - Date.now()) / 1000));
    const seconds = Math.round((Date.now() - started) / 1000);
    const problems = report?.ok ? [] : (report?.problems ?? ['the box gave no doctor report']);
    await comment(
      number,
      [
        problems.length
          ? `⚠️ Novu Box applied \`${short}\` but isn't healthy: ${origin} (${plan}, took ${seconds} s)`
          : `✅ Novu Box ready: ${origin} (applied \`${short}\`, ${plan}, took ${seconds} s)`,
        ...(problems.length
          ? [
              '',
              `Problems (\`node docker/box/cli.mjs doctor --cloud --box ${box}\`):`,
              ...problems.map((problem) => `- ${problem}`),
            ]
          : []),
        '',
        `- Mailpit: ${origin}/mail`,
        `- Sign in as \`agent@novu.co\` with the Novu Box seed password from the password manager, or sign up with your own \`@novu.co\` address.`,
        `- Every push applies the new head here. The box sleeps after an hour without requests and wakes on the next one (about 40 s). Removing \`${LABEL}\` or closing the PR deletes it.`,
        `- Logs: \`node docker/box/cli.mjs logs --cloud --box ${box}\``,
      ].join('\n')
    );

    return 0;
  } catch (error) {
    log(`ERROR: ${error.stack ?? error.message}`);
    const where = error.log
      ? `; the apply's log: \`node docker/box/cli.mjs exec --cloud --box ${box} -- cat ${error.log}\``
      : '';
    await comment(
      number,
      `❌ Novu Box failed on \`${short}\`: ${error.message.split('\n')[0].slice(0, 400)}\n\nLog: ${RUN_URL ?? 'this run'}${where}`
    );

    return 1;
  }
}

// A newer push cancels the run of the older one, but not that run's apply, which goes on in the box.
async function stopApply(cloud) {
  const stopped = await cloud.box(['stop-apply'], { capture: true });
  if (stopped) log(stopped);
}

// `box apply <sha>` detached in the box: it outlives this run when a newer push cancels it, and a stream that long
// would break (over 5 minutes, README). This waits while it holds the box's lock, then reads its log and the box's
// state. Returns its plan line.
async function apply(cloud, sha) {
  const file = `/data/logs/apply-${sha.slice(0, 12)}.log`;
  const fail = (message) => Object.assign(new Error(message), { log: file });
  log(`applying ${sha}; the box logs it to ${file}`);
  await cloud.run(detached([...BOX_CLI, 'apply', sha], file), { github: true, capture: true });
  const deadline = Math.min(Date.now() + APPLY_MINUTES * 60_000, DEADLINE);
  let lastSeen = Date.now();
  for (;;) {
    await sleep(10_000);
    const running = await cloud
      .run(['sh', '-c', `${BOX_CLI.join(' ')} state && tail -n 1 "$0"`, file], { capture: true })
      .then((text) => {
        lastSeen = Date.now();
        const [stateLine, ...last] = text.split('\n');
        const applying = JSON.parse(stateLine).lock?.command === 'apply';
        if (applying) log(`still applying: ${last.join(' ').slice(0, 200)}`);

        return applying;
      })
      .catch((error) => {
        if (Date.now() - lastSeen > 3 * 60_000) throw fail(`the box stopped answering: ${error.message}`);

        return true;
      });
    if (!running) break;
    if (Date.now() > deadline)
      throw fail(
        deadline === DEADLINE
          ? "the job's time ran out during the apply"
          : `the apply runs for over ${APPLY_MINUTES} minutes`
      );
  }
  const output = await cloud.run(['cat', file], { capture: true });
  console.log(output);
  const { applied, applying } = JSON.parse(await cloud.box(['state'], { capture: true }));
  if (applied?.head !== sha || applying) {
    throw fail(output.match(/ERROR: .*$/gm)?.at(-1) ?? `the apply ended without applying ${sha.slice(0, 10)}`);
  }

  return output.match(/plan: .*$/gm)?.at(-1) ?? 'plan: nothing';
}

// --- schedules ---

async function cleanup() {
  const { boxes } = await hostBoxes('boxes', { githubToken: boxToken, log });
  let failed = 0;
  for (const box of boxes.filter((name) => /^pr-\d+$/.test(name))) {
    const number = Number(box.slice(3));
    try {
      const pull = await github(`/repos/${REPO}/pulls/${number}`).catch((error) => {
        if (/-> 404:/.test(error.message)) return null;
        throw error;
      });
      if (pull?.state === 'open' && pull.labels.some((label) => label.name === LABEL)) continue;
      const why = !pull ? 'missing' : pull.state !== 'open' ? pull.state : `not labeled \`${LABEL}\``;
      log(`${box}: the PR is ${why}`);
      await target(box).delete();
      if (pull)
        await comment(
          number,
          `🗑️ Novu Box \`${box}\` deleted by the nightly cleanup: the PR is closed or no longer labeled \`${LABEL}\`.`,
          { onlyUpdate: true }
        );
    } catch (error) {
      log(`ERROR: ${box}: ${error.message}`);
      failed++;
    }
  }

  return failed ? 1 : 0;
}

// Deletes base and bakes it from next, then saves it, which also gives it a snapshot younger than Cloudflare's
// 30 days. Until it's back (about 20 minutes), a new PR box bakes next itself.
async function rebake() {
  const base = target('base');
  await base.delete();
  await base.up({ ref: 'next' });

  return base.down();
}

const commands = { pr, cleanup, rebake };
const command = commands[process.argv[2]];
if (!command) {
  console.error(`usage: node docker/box/ci.mjs ${Object.keys(commands).join('|')}`);
  process.exit(2);
}

try {
  process.exitCode = await command();
} catch (error) {
  log(`ERROR: ${error.message}`);
  process.exitCode = 1;
}
