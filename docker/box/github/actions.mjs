#!/usr/bin/env node
// Novu Box per pull request, run by .github/workflows/novu-box.yml (README, "Per pull request"). Plain Node, no npm
// dependencies. It drives boxes as `cli.mjs --cloud` does (cloud/target.mjs), signed in with the workflow's GitHub
// Actions OIDC token, and has the host create and delete their Workers (cloud/boxes.js), so the workflow holds no
// secret. Run by hand, it signs in with GITHUB_TOKEN or `gh auth token` instead.
//
//   node docker/box/github/actions.mjs pr       the pull_request event in GITHUB_EVENT_PATH: start the PR's box
//                                                pr-<number> from base and apply the PR's head, or delete the box;
//                                                one sticky PR comment says how it went
//   node docker/box/github/actions.mjs cleanup  delete pr-* boxes whose PR is closed or no longer labeled `box`
//   node docker/box/github/actions.mjs rebake   bake base again from next and save it to its snapshot

import fs from 'node:fs';
import { OIDC_AUDIENCE } from '../cloud/auth.mjs';
import { boxWorker } from '../cloud/shared.mjs';
import { cloudTarget, DOMAIN, hostBoxes } from '../cloud/target.mjs';
import { githubToken } from '../node.mjs';

const REPO = process.env.GITHUB_REPOSITORY ?? 'novuhq/novu';
const LABEL = 'box';
const MAX_BOXES = 30;
// The longest an apply may take: a full one (install, every build) takes about 6 minutes.
const APPLY_MINUTES = 30;
const MARK = '<!-- novu-box -->';
const RUN_URL =
  process.env.GITHUB_RUN_ID && `${process.env.GITHUB_SERVER_URL}/${REPO}/actions/runs/${process.env.GITHUB_RUN_ID}`;
const APPLY = '^node /opt/box/box.mjs apply';
const started = Date.now();

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
  return cloudTarget({ box, log, githubToken: boxToken, viaHost: true });
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
    const current = await cloud.state();
    // Never started, or created by a run that was cancelled before the box first came up.
    if (!current?.running && !current?.snapshot) {
      const { boxes } = await hostBoxes('', { githubToken: boxToken });
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
      if (current.running) await stopApply(cloud);
      await cloud.ready({ applyPending: true });
    }
    const plan = await apply(cloud, sha);
    const seconds = Math.round((Date.now() - started) / 1000);
    await comment(
      number,
      [
        `✅ Novu Box ready: ${origin} (applied \`${short}\`, ${plan}, took ${seconds} s)`,
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

// A newer push cancels the run of the older one, but not that run's apply, which goes on in the box: stop it and
// everything it started (its process group, see `apply`), within a minute. Its .applying.json makes the next apply
// redo its files; a git lock it left would stop the next checkout. `sh` is dash, whose kill takes no `--`.
const STOP_APPLY = `
groups=""; pids=$(pgrep -f '${APPLY}')
[ -z "$pids" ] && exit 0
for pid in $pids; do
  if [ "$(ps -o pgid= -p "$pid" | tr -d ' ')" = "$pid" ]; then groups="$groups $pid"; kill -TERM "-$pid"; else kill -TERM "$pid"; fi
done
for i in $(seq 60); do
  [ -z "$(pgrep -f '${APPLY}'; for g in $groups; do pgrep -g "$g"; done)" ] && break
  sleep 1
done
for g in $groups; do kill -KILL "-$g" 2>/dev/null; done
pkill -KILL -f '${APPLY}'
rm -f /data/novu/.git/index.lock
echo "stopped the apply of an older push (pid $pids)"
`;

async function stopApply(cloud) {
  const stopped = await cloud.run(['sh', '-c', STOP_APPLY], { capture: true });
  if (stopped) log(stopped);
}

// `box apply <sha>` on its own in the box (nohup, its own session, so STOP_APPLY can stop all of it): it outlives
// this run when a newer push cancels it, and a stream that long would break (over 5 minutes, README). This waits
// for it to end, then reads its log and the box's state. Returns its plan line.
async function apply(cloud, sha) {
  const file = `/data/logs/apply-${sha.slice(0, 12)}.log`;
  const fail = (message) => Object.assign(new Error(message), { log: file });
  log(`applying ${sha}; the box logs it to ${file}`);
  await cloud.run(['sh', '-c', 'nohup setsid node /opt/box/box.mjs apply "$0" > "$1" 2>&1 &', sha, file], {
    github: true,
    capture: true,
  });
  const deadline = Date.now() + APPLY_MINUTES * 60_000;
  let lastSeen = Date.now();
  for (;;) {
    await sleep(10_000);
    const running = await cloud
      .run(['sh', '-c', `pgrep -f '${APPLY}' > /dev/null && tail -n 1 "$0" || echo __done__`, file], { capture: true })
      .then((line) => {
        lastSeen = Date.now();
        if (line !== '__done__') log(`still applying: ${line.slice(0, 200)}`);

        return line !== '__done__';
      })
      .catch((error) => {
        if (Date.now() - lastSeen > 3 * 60_000) throw fail(`the box stopped answering: ${error.message}`);

        return true;
      });
    if (!running) break;
    if (Date.now() > deadline) throw fail(`the apply runs for over ${APPLY_MINUTES} minutes`);
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
  const { boxes } = await hostBoxes('', { githubToken: boxToken });
  let failed = 0;
  for (const box of boxes.filter((name) => /^pr-\d+$/.test(name))) {
    const number = Number(box.slice(3));
    try {
      const pull = await github(`/repos/${REPO}/pulls/${number}`).catch((error) => {
        if (/-> 404:/.test(error.message)) return null;
        throw error;
      });
      if (pull?.state === 'open' && pull.labels.some((label) => label.name === LABEL)) continue;
      log(`${box}: the PR is ${pull ? (pull.state === 'open' ? `not labeled \`${LABEL}\`` : pull.state) : 'missing'}`);
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
  console.error(`usage: node docker/box/github/actions.mjs ${Object.keys(commands).join('|')}`);
  process.exit(2);
}

try {
  process.exitCode = await command();
} catch (error) {
  log(`ERROR: ${error.message}`);
  process.exitCode = 1;
}
