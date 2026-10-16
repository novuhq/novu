#!/usr/bin/env node
// Novu Box per pull request, run by .github/workflows/novu-box.yml (README, "Per pull request"). It drives boxes as
// `box --cloud` does (src/cli/cloud.ts), signed in with the workflow's GitHub Actions OIDC token, and has the host
// create and delete their Workers (src/cloud/boxes.ts), so the workflow holds no secret. Run by hand, it signs in
// with GITHUB_TOKEN or `gh auth token` instead.
//
//   node docker/box/src/ci/ci.ts pr       the pull_request event in GITHUB_EVENT_PATH: start the PR's box pr-<number>
//                                         from base and apply the PR's head, or delete the box; one sticky PR
//                                         comment says how it went
//   node docker/box/src/ci/ci.ts cleanup  delete pr-* boxes whose PR is closed or no longer labeled `box`
//   node docker/box/src/ci/ci.ts rebake   bake base again from next and save it to its snapshot

import fs from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import * as z from 'zod';
import { type CloudTarget, cloudTarget } from '../cli/cloud.ts';
import { hostBoxes } from '../cli/cloud-http.ts';
import { githubToken } from '../cli/target.ts';
import { runCommand } from '../node/commands.ts';
import { fetchJson, HttpError } from '../node/http.ts';
import { log, main } from '../node/main.ts';
import { poll } from '../node/poll.ts';
import { BoxList, BoxState, fromJson, OidcToken, Pull, PullRequestEvent } from '../shared/contracts.ts';
import { BOX_CLI, boxWorker, DOMAIN, detached, OIDC_AUDIENCE } from '../shared/names.ts';
import { canWrite, comment, github, LABEL, labeler, REPO, unlessMissing } from './github.ts';

const MAX_BOXES = 30;
// The longest an apply may take: a full one (install, every build) takes about 6 minutes.
const APPLY_MINUTES = 20;
// How long the box may take to pass its doctor after an apply restarted its apps.
const SETTLE_SECONDS = 3 * 60;
// The laptop CLI, as a PR comment tells people to run it from the repository (after `npm ci` in docker/box).
const CLI = 'node docker/box/src/cli/main.ts';
const RUN_URL =
  process.env.GITHUB_RUN_ID && `${process.env.GITHUB_SERVER_URL}/${REPO}/actions/runs/${process.env.GITHUB_RUN_ID}`;
const started = Date.now();
// Every wait ends by then, so the run can still say why in the comment: 5 minutes before the job's timeout-minutes
// (60, .github/workflows/novu-box.yml) ends it. The worst case (a save to wait out, a bake, a full apply) takes longer.
const DEADLINE = started + 55 * 60_000;

// An apply that failed, with the box file that has its log, for the PR comment.
class ApplyFailed extends Error {
  readonly log: string;

  constructor(message: string, log: string) {
    super(message);
    this.log = log;
  }
}

// --- tokens ---

// What the host and the boxes accept from this run (shared/auth.ts): the workflow's OIDC token, fetched again a
// minute before it expires; run by hand, the GitHub token.
let oidc: { readonly value: string; readonly exp: number } | undefined;

async function boxToken(): Promise<string> {
  const { ACTIONS_ID_TOKEN_REQUEST_URL: url, ACTIONS_ID_TOKEN_REQUEST_TOKEN: requestToken = '' } = process.env;
  if (!url) return githubToken();
  if (oidc && oidc.exp - 60 > Date.now() / 1000) return oidc.value;
  const { value } = await fetchJson(`${url}&audience=${OIDC_AUDIENCE}`, OidcToken, {
    headers: { Authorization: `Bearer ${requestToken}` },
  }).catch((error: Error) => {
    if (error instanceof HttpError)
      throw new Error(`the OIDC token request answered ${error.status}; the job needs id-token: write`);
    throw new Error(`the OIDC token request: ${error.message}`);
  });
  const [, payload = ''] = value.split('.');
  const exp = fromJson(z.object({ exp: z.number() })).safeParse(Buffer.from(payload, 'base64url').toString()).data?.exp;
  oidc = { value, exp: exp ?? 0 };

  return value;
}

// The box's cloud target, signed in with boxToken; it never deploys the host, and no wait runs past DEADLINE.
const target = (box: string) => cloudTarget({ box, token: boxToken, mayDeployHost: false, deadline: DEADLINE });

const hostList = async () => (await hostBoxes('boxes', BoxList, { token: boxToken })).boxes;

// --- pr ---

async function pr(): Promise<number> {
  const decoded = fromJson(PullRequestEvent).safeParse(fs.readFileSync(process.env.GITHUB_EVENT_PATH ?? '', 'utf8'));
  if (!decoded.success) throw new Error(`the pull_request event: ${z.prettifyError(decoded.error)}`);
  const event = decoded.data;
  const { action, number, pull_request: pull } = event;
  const labeled = pull.labels.some((label) => label.name === LABEL);
  if (['labeled', 'unlabeled'].includes(action) ? event.label?.name !== LABEL : !labeled && action !== 'closed') {
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

async function applyHead(number: number, sha: string): Promise<number> {
  const box = `pr-${number}`;
  const short = sha.slice(0, 10);
  const origin = `https://${boxWorker(box)}.${DOMAIN}`;
  const cloud = target(box);
  await comment(number, `⏳ Applying \`${short}\` to Novu Box \`${box}\`…${RUN_URL ? ` ([log](${RUN_URL}))` : ''}`);
  try {
    if (!(await startOrReach(cloud, box, number))) return 0;
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
          ? ['', `Problems (\`${CLI} doctor --cloud --box ${box}\`):`, ...problems.map((problem) => `- ${problem}`)]
          : []),
        '',
        `- Mailpit: ${origin}/mail`,
        `- Sign in as \`agent@novu.co\` with the Novu Box seed password from the password manager, or sign up with your own \`@novu.co\` address.`,
        `- Every push applies the new head here. The box sleeps after an hour without requests and wakes on the next one (about 40 s). Removing \`${LABEL}\` or closing the PR deletes it.`,
        `- Logs: \`${CLI} logs --cloud --box ${box}\``,
      ].join('\n')
    );

    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`ERROR: ${message}`);
    const where =
      error instanceof ApplyFailed ? `; the apply's log: \`${CLI} exec --cloud --box ${box} -- cat ${error.log}\`` : '';
    const [first = ''] = message.split('\n');
    await comment(
      number,
      `❌ Novu Box failed on \`${short}\`: ${first.slice(0, 400)}\n\nLog: ${RUN_URL ?? 'this run'}${where}`
    );

    return 1;
  }
}

// A new box starts from base, unless MAX_BOXES exist (false). A box that exists is woken or waited for: a save to
// wait out, or a bake an earlier push started (a box that runs answers its doctor, whatever the doctor finds); then
// the apply an earlier, cancelled run left going is stopped.
async function startOrReach(cloud: CloudTarget, box: string, number: number): Promise<boolean> {
  const phase = (await cloud.state())?.phase ?? 'new';
  // Never started, created by a run cancelled before the box first came up, its bake failed, or its snapshot is lost.
  if (phase === 'new' || phase === 'lost') {
    const others = (await hostList()).filter((name) => /^pr-\d+$/.test(name) && name !== box);
    if (others.length >= MAX_BOXES) {
      await comment(
        number,
        `⏸️ No Novu Box: ${others.length} PR boxes exist, and ${MAX_BOXES} is the most at once. Remove \`${LABEL}\` from a PR you're done with, then remove and add \`${LABEL}\` here again.`
      );

      return false;
    }
    await cloud.up({ fromBase: true });

    return true;
  }
  await cloud.readyFor({ reachable: true });
  // A newer push cancels the run of the older one, but not that run's apply, which goes on in the box.
  const stopped = await cloud.boxOutput(['stop-apply']);
  if (stopped) log(stopped);

  return true;
}

// `box apply <sha>` detached in the box: it outlives this run when a newer push cancels it, and a stream that long
// would break (over 5 minutes, README). This waits while it holds the box's lock, then reads its log and the box's
// state. Returns its plan line.
async function apply(cloud: CloudTarget, sha: string): Promise<string> {
  const file = `/data/logs/apply-${sha.slice(0, 12)}.log`;
  const boxState = (text: string) => {
    const state = fromJson(BoxState).safeParse(text);
    if (!state.success) throw new Error(`\`box state\`: ${z.prettifyError(state.error)}`);

    return state.data;
  };
  log(`applying ${sha}; the box logs it to ${file}`);
  await cloud.runOutput(detached([...BOX_CLI, 'apply', sha], file), { github: true });
  const deadline = Math.min(Date.now() + APPLY_MINUTES * 60_000, DEADLINE);
  let lastSeen = Date.now();
  const applying = async () => {
    try {
      const [stateLine = '', ...last] = (
        await cloud.runOutput(['sh', '-c', `${BOX_CLI.join(' ')} state && tail -n 1 "$0"`, file])
      ).split('\n');
      lastSeen = Date.now();
      const still = boxState(stateLine).lock?.command === 'apply';
      if (still) log(`still applying: ${last.join(' ').slice(0, 200)}`);

      return still;
    } catch (error) {
      if (Date.now() - lastSeen <= 3 * 60_000) return true;
      throw new ApplyFailed(`the box stopped answering: ${error instanceof Error ? error.message : error}`, file);
    }
  };
  await sleep(10_000);
  await poll(
    async () => {
      if (!(await applying())) return true;
      if (Date.now() > deadline)
        throw new ApplyFailed(
          deadline === DEADLINE
            ? "the job's time ran out during the apply"
            : `the apply runs for over ${APPLY_MINUTES} minutes`,
          file
        );

      return false;
    },
    { timeoutMs: Number.POSITIVE_INFINITY, everyMs: 10_000 }
  );
  const output = await cloud.runOutput(['cat', file]);
  console.log(output);
  const { applied, applying: unfinished } = boxState(await cloud.boxOutput(['state']));
  if (applied?.head !== sha || unfinished)
    throw new ApplyFailed(
      output.match(/ERROR: .*$/gm)?.at(-1) ?? `the apply ended without applying ${sha.slice(0, 10)}`,
      file
    );

  return output.match(/plan: .*$/gm)?.at(-1) ?? 'plan: nothing';
}

// --- schedules ---

async function cleanup(): Promise<number> {
  let failed = 0;
  for (const box of (await hostList()).filter((name) => /^pr-\d+$/.test(name))) {
    const number = Number(box.slice(3));
    try {
      const pull = await github(`/repos/${REPO}/pulls/${number}`, Pull).catch(unlessMissing);
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
      log(`ERROR: ${box}: ${error instanceof Error ? error.message : error}`);
      failed++;
    }
  }

  return failed ? 1 : 0;
}

// Deletes base and bakes it from next, then saves it, which also gives it a snapshot younger than Cloudflare's
// 30 days. Until it's back (about 20 minutes), a new PR box bakes next itself.
async function rebake(): Promise<number> {
  const base = target('base');
  await base.delete();
  await base.up({ ref: 'next' });

  return base.down();
}

await main('ci', () =>
  runCommand('ci', {
    pr: { usage: '', help: "the pull_request event's box", run: pr },
    cleanup: { usage: '', help: 'delete stale pr-* boxes', run: cleanup },
    rebake: { usage: '', help: 'bake base again from next', run: rebake },
  })
);
