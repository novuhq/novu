import * as z from 'zod';
import { authorize } from '../shared/auth.ts';
import { decode, type TesterArmyPullRequest, TesterArmyStart } from '../shared/contracts.ts';
import { messageOf } from '../shared/errors.ts';
import { boxOrigin } from '../shared/names.ts';
import { liveBoxes } from './boxes.ts';
import { deleteSignUpUsers } from './clerk.ts';
import type { HostEnv } from './env.ts';
import { json, text } from './life.ts';

const API = 'https://tester.army/api/v1';
// TesterArmy's "Novu Box" project, and the group that runs on every PR: one batch, so one comment on the PR.
const PROJECT = '7face08e-82db-4350-bfa3-c4a736709f9c';
const SMOKE = { name: 'PR smoke', id: '561cdead-b919-418f-a65e-1b4b8dc90242' };
// The full suite, for the nightly box of next: no PR, so no exploration and no PR comment. It starts through the
// groups' webhooks, in this order in TESTERARMY_NIGHTLY_WEBHOOKS: TesterArmy posts to Slack only for webhook runs.
const FULL = ['Full', 'Full: account', 'Full: Slack'];

interface Group {
  readonly name: string;
  readonly id: string;
}

// TesterArmy's group run body: a PR's number and commit make it report on the PR.
interface GroupRunBody {
  readonly targetUrl: string;
  readonly prNumber?: number;
  readonly commitSha?: string;
}

const PrRun = z.object({ status: z.string(), runId: z.string() });
const GroupRun = z.object({ batchId: z.string(), queuedRunIds: z.array(z.string()) });
const WebhookRun = z.object({ runIds: z.array(z.string()) });
const Runs = z.object({
  runs: z.array(
    z.object({ id: z.string(), externalRef: z.looseObject({ prNumber: z.number().optional() }).nullish() })
  ),
});

export async function testerArmy(request: Request, env: HostEnv, url: URL): Promise<Response> {
  try {
    return await route(request, env, url);
  } catch (error) {
    return text(`${messageOf(error)}\n`, 500);
  }
}

async function route(request: Request, env: HostEnv, url: URL): Promise<Response> {
  if (!(await authorize(request, env))) return text("needs the same Authorization as a box's /__box/*\n", 401);
  const box = decodeURIComponent(url.pathname.slice('/__box/testerarmy/'.length));
  if (request.method === 'DELETE' && box) return json({ cancelled: await cancelPullRequest(env, box) });
  if (request.method !== 'POST' || !box) return text('not found\n', 404);
  if (!(await liveBoxes(env)).includes(box)) return text(`no box ${box}\n`, 404);
  const start = decode(TesterArmyStart, await request.text(), 'the request');
  const targetUrl = boxOrigin(box);
  const signUpUsersDeleted = await deleteSignUpUsers(env);
  if ('pullRequest' in start)
    return json({ ...(await startPullRequest(env, targetUrl, start.pullRequest)), signUpUsersDeleted });

  return json({ groups: await startFull(env, targetUrl), signUpUsersDeleted });
}

// A PR's queued and running runs, the exploration agent's and PR smoke's: they test a head the box no longer runs.
async function cancelPullRequest(env: HostEnv, box: string): Promise<Array<string>> {
  const number = Number(/^pr-(\d+)$/.exec(box)?.[1]);
  if (!number) return [];
  const cancelled: Array<string> = [];
  for (const status of ['queued', 'running']) {
    const { runs } = await call(env, `/runs?projectId=${PROJECT}&status=${status}&limit=100`, Runs);
    for (const run of runs.filter((item) => item.externalRef?.prNumber === number)) {
      // 409: it finished in the meantime.
      await call(env, `/runs/${run.id}/cancel`, z.unknown(), {}).then(
        () => cancelled.push(run.id),
        (error: unknown) => console.log(`cancelling ${run.id}: ${messageOf(error)}`)
      );
    }
  }

  return cancelled;
}

async function startFull(env: HostEnv, targetUrl: string) {
  const webhooks = env.TESTERARMY_NIGHTLY_WEBHOOKS?.split(/\s+/).filter(Boolean) ?? [];
  if (webhooks.length !== FULL.length)
    throw new Error(
      `TESTERARMY_NIGHTLY_WEBHOOKS needs ${FULL.length} URLs (${FULL.join(', ')}), not ${webhooks.length}`
    );
  const started = [];
  for (const [index, name] of FULL.entries()) {
    const run = await post(webhooks[index] ?? '', `the ${name} webhook`, WebhookRun, {
      targetUrl,
      environment: 'staging',
    });
    started.push({ name, runs: run.runIds.length });
  }

  return started;
}

async function startPullRequest(env: HostEnv, targetUrl: string, pullRequest: TesterArmyPullRequest) {
  const exploration = await call(env, `/projects/${PROJECT}/pull-request-runs`, PrRun, {
    targetUrl,
    platform: 'web',
    pullRequest,
  });
  const groups = await startGroups(env, [SMOKE], {
    targetUrl,
    prNumber: pullRequest.number,
    commitSha: pullRequest.commitSha,
  });

  return { exploration, groups };
}

async function startGroups(env: HostEnv, groups: ReadonlyArray<Group>, body: GroupRunBody) {
  const started = [];
  for (const group of groups) {
    const run = await call(env, `/groups/${group.id}/runs`, GroupRun, body);
    started.push({ name: group.name, batchId: run.batchId, runs: run.queuedRunIds.length });
  }

  return started;
}

// A GET without a body, a POST with one.
async function call<T>(env: HostEnv, path: string, schema: z.ZodType<T>, body?: unknown): Promise<T> {
  if (!env.TESTERARMY_API_KEY) throw new Error('the host has no TESTERARMY_API_KEY');
  const method = body === undefined ? 'GET' : 'POST';

  return send(`${API}${path}`, `TesterArmy ${method} ${path}`, schema, {
    method,
    headers: {
      Authorization: `Bearer ${env.TESTERARMY_API_KEY}`,
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
}

// A webhook's URL is its secret, so errors name the webhook, not the URL.
function post<T>(url: string, what: string, schema: z.ZodType<T>, body: unknown): Promise<T> {
  return send(url, `TesterArmy POST ${what}`, schema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function send<T>(url: string, what: string, schema: z.ZodType<T>, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const answer = await response.text();
  if (!response.ok) throw new Error(`${what} -> ${response.status}: ${answer.slice(0, 300)}`);

  return decode(schema, answer, what);
}
