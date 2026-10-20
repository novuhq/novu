#!/usr/bin/env node

import fs from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import * as z from 'zod';
import { type CloudTarget, cloudTarget } from '../cli/cloud.ts';
import { githubToken, hostBoxes } from '../cli/cloud-http.ts';
import { runCommand } from '../node/commands.ts';
import { fetchJson, HttpError } from '../node/http.ts';
import { log, main } from '../node/main.ts';
import { poll } from '../node/poll.ts';
import {
  BoxList,
  BoxState,
  decode,
  fromJson,
  needsBake,
  OidcToken,
  Pull,
  PullRequestEvent,
  type TesterArmyStart,
  TesterArmyStarted,
} from '../shared/contracts.ts';
import { messageOf } from '../shared/errors.ts';
import { BOX_CLI, boxOrigin, detached, OIDC_AUDIENCE } from '../shared/names.ts';
import { canWrite, comment, github, LABEL, labeler, REPO, unlessMissing } from './github.ts';

const MAX_BOXES = 30;
const REBAKE_BOX = 'base-next';
const NIGHTLY_BOX = 'nightly';
const APPLY_MINUTES = 20;
const SETTLE_SECONDS = 3 * 60;
// Past a day since base's bake, a nightly rebake was skipped (a refresh that waited replaced it).
const REBAKE_HOURS = 26;
const CLI = 'node docker/box/src/cli/main.ts';
const RUN_URL =
  process.env.GITHUB_RUN_ID && `${process.env.GITHUB_SERVER_URL}/${REPO}/actions/runs/${process.env.GITHUB_RUN_ID}`;
const started = Date.now();
const DEADLINE = started + 55 * 60_000;

class ApplyFailed extends Error {
  readonly log: string;

  constructor(message: string, log: string) {
    super(message);
    this.log = log;
  }
}

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

const target = (box: string) => cloudTarget({ box, token: boxToken, deadline: DEADLINE });

const hostList = async () => (await hostBoxes('boxes', BoxList, { token: boxToken })).boxes;

async function pr(): Promise<number> {
  const event = decode(
    PullRequestEvent,
    fs.readFileSync(process.env.GITHUB_EVENT_PATH ?? '', 'utf8'),
    'the pull_request event'
  );
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

  return applyHead(number, pull);
}

async function applyHead(number: number, pull: PullRequestEvent['pull_request']): Promise<number> {
  const box = `pr-${number}`;
  const { sha } = pull.head;
  const short = sha.slice(0, 10);
  const origin = boxOrigin(box);
  const cloud = target(box);
  await comment(number, `⏳ Applying \`${short}\` to Novu Box \`${box}\`…${RUN_URL ? ` ([log](${RUN_URL}))` : ''}`);
  try {
    if (!(await startOrReach(cloud, box, number))) return 0;
    const plan = await apply(cloud, sha);
    const report = await cloud.settled(Math.min(SETTLE_SECONDS, (DEADLINE - Date.now()) / 1000));
    const seconds = Math.round((Date.now() - started) / 1000);
    const problems = report?.ok ? [] : (report?.problems ?? ['the box gave no doctor report']);
    // A box that's ready stays ready when TesterArmy doesn't start.
    const tests = problems.length
      ? []
      : [
          await startTesterArmy(box, {
            pullRequest: {
              number,
              title: pull.title,
              ...(pull.body && { description: pull.body.slice(0, 65_536) }),
              baseBranch: pull.base.ref,
              headBranch: pull.head.ref,
              commitSha: sha,
            },
          }).then(
            (suites) => `- TesterArmy started: ${suites}. Its results come as checks on this PR.`,
            (error: unknown) => {
              log(`WARN: starting TesterArmy: ${messageOf(error)}`);
              const [first = ''] = messageOf(error).split('\n');

              return `- TesterArmy didn't start: ${first.slice(0, 300)}`;
            }
          ),
        ];
    await comment(
      number,
      [
        problems.length
          ? `⚠️ Novu Box applied \`${short}\` but isn't healthy: ${origin} (${plan}, took ${seconds} s)`
          : `✅ Novu Box ready: ${origin} (applied \`${short}\`, ${plan}, took ${seconds} s)`,
        ...(problems.length
          ? ['', `Problems (\`${CLI} doctor --box ${box}\`):`, ...problems.map((problem) => `- ${problem}`)]
          : []),
        '',
        ...tests,
        `- Mailpit: ${origin}/mail`,
        `- Sign in as \`agent@novu.co\` with the Novu Box seed password from the password manager, or sign up with your own \`@novu.co\` address.`,
        `- Every push applies the new head here. The box sleeps after an hour without requests and wakes on the next one (about 40 s). Removing \`${LABEL}\` or closing the PR deletes it.`,
        `- Logs: \`${CLI} logs --box ${box}\``,
      ].join('\n')
    );

    return 0;
  } catch (error) {
    const message = messageOf(error);
    log(`ERROR: ${message}`);
    const where =
      error instanceof ApplyFailed ? `; the apply's log: \`${CLI} exec --box ${box} -- cat ${error.log}\`` : '';
    const [first = ''] = message.split('\n');
    await comment(
      number,
      `❌ Novu Box failed on \`${short}\`: ${first.slice(0, 400)}\n\nLog: ${RUN_URL ?? 'this run'}${where}`
    );

    return 1;
  }
}

// The apply restarts the API, so the box only has to answer before it.
async function startOrReach(cloud: CloudTarget, box: string, number: number): Promise<boolean> {
  const current = await cloud.state();
  if (!current || needsBake(current)) {
    const others = (await hostList()).filter((name) => /^pr-\d+$/.test(name) && name !== box);
    if (others.length >= MAX_BOXES) {
      await comment(
        number,
        `⏸️ No Novu Box: ${others.length} PR boxes exist, and ${MAX_BOXES} is the most at once. Remove \`${LABEL}\` from a PR you're done with, then remove and add \`${LABEL}\` here again.`
      );

      return false;
    }
  }
  await cloud.up({ fromBase: true, reachable: true });
  const stopped = await cloud.boxOutput(['stop-apply']);
  if (stopped) log(stopped);

  return true;
}

// Returns what started, for the PR comment; TesterArmy reports results on the PR itself, as checks and a comment.
async function startTesterArmy(box: string, start: TesterArmyStart): Promise<string> {
  const { exploration, groups, signUpUsersDeleted } = await hostBoxes(`testerarmy/${box}`, TesterArmyStarted, {
    method: 'POST',
    body: JSON.stringify(start),
    token: boxToken,
  });
  if (signUpUsersDeleted.length) log(`deleted leftover sign-up users: ${signUpUsersDeleted.join(', ')}`);
  const suites = groups.map((group) => `${group.name} (${group.runs} runs)`);
  if (exploration) suites.unshift(exploration.status === 'skipped' ? 'exploration (skipped)' : 'exploration');
  log(`TesterArmy started on ${box}: ${suites.join(', ')}`);

  return suites.join(', ');
}

// A fresh box from base each night, so every suite runs on next's head; it stays until the next night, for a look
// at what failed.
async function nightly(): Promise<number> {
  const cloud = target(NIGHTLY_BOX);
  await cloud.delete();
  await cloud.up({ fromBase: true, reachable: true });
  const report = await cloud.settled(Math.min(SETTLE_SECONDS, (DEADLINE - Date.now()) / 1000));
  if (!report?.ok) {
    log(`ERROR: ${NIGHTLY_BOX} isn't healthy: ${(report?.problems ?? ['no doctor report']).join('; ')}`);

    return 1;
  }
  await startTesterArmy(NIGHTLY_BOX, {});

  return 0;
}

async function apply(cloud: CloudTarget, sha: string, { baseline = false } = {}): Promise<string> {
  const file = `/data/logs/apply-${sha.slice(0, 12)}.log`;
  const boxState = (text: string) => decode(BoxState, text, '`box state`');
  log(`applying ${sha}; the box logs it to ${file}`);
  await cloud.runOutput(detached([...BOX_CLI, 'apply', sha, ...(baseline ? ['--baseline'] : [])], file), {
    github: true,
  });
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
      throw new ApplyFailed(`the box stopped answering: ${messageOf(error)}`, file);
    }
  };
  await sleep(10_000);
  await poll(async () => !(await applying()), {
    timeoutMs: deadline - Date.now(),
    everyMs: 10_000,
    orElse: () => {
      throw new ApplyFailed(
        deadline === DEADLINE
          ? "the job's time ran out during the apply"
          : `the apply runs for over ${APPLY_MINUTES} minutes`,
        file
      );
    },
  });
  const output = await cloud.runOutput(['cat', file]);
  console.log(output);
  const { baked, applied, applying: unfinished } = boxState(await cloud.boxOutput(['state']));
  if ((baseline ? baked?.sha : applied?.head) !== sha || unfinished)
    throw new ApplyFailed(
      output.match(/ERROR: .*$/gm)?.at(-1) ?? `the apply ended without applying ${sha.slice(0, 10)}`,
      file
    );

  return output.match(/plan: .*$/gm)?.at(-1) ?? 'plan: nothing';
}

function whyStale(pull: { readonly state: string }): string {
  return pull.state === 'open' ? `not labeled \`${LABEL}\`` : pull.state;
}

async function cleanup(): Promise<number> {
  let failed = 0;
  for (const box of (await hostList()).filter((name) => /^pr-\d+$/.test(name))) {
    const number = Number(box.slice(3));
    try {
      const pull = await github(`/repos/${REPO}/pulls/${number}`, Pull).catch(unlessMissing);
      if (pull?.state === 'open' && pull.labels.some((label) => label.name === LABEL)) continue;
      log(`${box}: the PR is ${pull ? whyStale(pull) : 'missing'}`);
      await target(box).delete();
      if (pull)
        await comment(
          number,
          `🗑️ Novu Box \`${box}\` deleted by the nightly cleanup: the PR is closed or no longer labeled \`${LABEL}\`.`,
          { onlyUpdate: true }
        );
    } catch (error) {
      log(`ERROR: ${box}: ${messageOf(error)}`);
      failed++;
    }
  }

  return failed ? 1 : 0;
}

// Bakes next in a box of its own and saves it, then base takes over that snapshot: a new snapshot chain, younger than
// Cloudflare's 30 days, so the refreshes' deltas don't pile up forever. Until the new snapshot is saved, base keeps
// its own, and a failed bake leaves it.
async function rebake(): Promise<number> {
  const baking = target(REBAKE_BOX);
  try {
    await baking.delete();
    await baking.up({ ref: 'next' });
    if ((await baking.down()) !== 0) throw new Error(`${baking.name} stopped without a new snapshot`);
    const snapshot = (await baking.state())?.snapshot?.id;
    if (!snapshot) throw new Error(`${baking.name} has no snapshot`);
    await target('base').adopt(snapshot);
  } finally {
    await baking.delete().catch((error: unknown) => log(`WARN: deleting ${baking.name}: ${messageOf(error)}`));
  }

  return 0;
}

// Puts next's head on base and saves it, so a new PR box starts from it and builds only its own changes. A failed
// apply stops base without a save, so it keeps its last snapshot, and the next push tries again; a half-applied
// base would be saved by its idle sleep, and every new PR box would start from that.
async function refresh(): Promise<number> {
  const base = target('base');
  const { sha } = await github(`/repos/${REPO}/commits/next`, z.object({ sha: z.string() }));
  try {
    await base.readyFor({ reachable: true });
  } catch (error) {
    return rebakeBecause(`${base.name} doesn't wake: ${messageOf(error)}`);
  }
  let tooOld: string | null = null;
  try {
    const { baked, applied, applying } = decode(BoxState, await base.boxOutput(['state']), '`box state`');
    if (!baked) throw new Error(`${base.name} isn't baked`);
    const hours = (Date.now() - Date.parse(baked.at)) / 3_600_000;
    tooOld = hours > REBAKE_HOURS ? `${base.name} was baked ${Math.round(hours)} hours ago` : null;
    if (!tooOld) {
      if (baked.sha === sha && !applied && !applying) {
        log(`${base.name} is on next's head ${sha.slice(0, 10)} already`);
        await base.discard();

        return 0;
      }
      log(await apply(base, sha, { baseline: true }));

      return await base.down();
    }
  } catch (error) {
    log(`ERROR: refreshing ${base.name} failed, so it keeps its last snapshot: ${messageOf(error)}`);
    await base.discard();

    return 1;
  }
  await base.discard();

  return rebakeBecause(tooOld);
}

function rebakeBecause(why: string): Promise<number> {
  log(`${why}: baking base again instead`);

  return rebake();
}

await main('ci', () =>
  runCommand('ci', {
    pr: {
      usage: '',
      help: "the pull_request event in GITHUB_EVENT_PATH: start or update the PR's box pr-<number>,\nor delete it; one sticky PR comment says how it went",
      run: pr,
    },
    cleanup: { usage: '', help: 'delete pr-* boxes whose PR is closed or no longer labeled `box`', run: cleanup },
    rebake: { usage: '', help: 'bake base again from next and save it to its snapshot (a new chain)', run: rebake },
    refresh: { usage: '', help: "put next's head on base (merges onto it from then on) and save it", run: refresh },
    nightly: {
      usage: '',
      help: `start a fresh box ${NIGHTLY_BOX} from base and run every TesterArmy suite on it`,
      run: nightly,
    },
  })
);
