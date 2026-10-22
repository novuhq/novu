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
// The full suite, for the nightly box of next: no PR, so no exploration and no PR comment.
const FULL: ReadonlyArray<Group> = [
  { name: 'Full', id: 'fef21e20-5d8a-4b3c-9f57-9105d6755035' },
  { name: 'Full: account', id: '46526209-9574-46d7-8c88-490cdac79509' },
  { name: 'Full: Slack', id: 'e90228d0-0fee-49dc-a250-1a54639bad82' },
];

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

export async function testerArmy(request: Request, env: HostEnv, url: URL): Promise<Response> {
  try {
    return await route(request, env, url);
  } catch (error) {
    return text(`${messageOf(error)}\n`, 500);
  }
}

async function route(request: Request, env: HostEnv, url: URL): Promise<Response> {
  if (!(await authorize(request))) return text("needs the same Authorization as a box's /__box/*\n", 401);
  const box = decodeURIComponent(url.pathname.slice('/__box/testerarmy/'.length));
  if (request.method !== 'POST' || !box) return text('not found\n', 404);
  if (!(await liveBoxes(env)).includes(box)) return text(`no box ${box}\n`, 404);
  const start = decode(TesterArmyStart, await request.text(), 'the request');
  const targetUrl = boxOrigin(box);
  const signUpUsersDeleted = await deleteSignUpUsers(env);
  if ('pullRequest' in start)
    return json({ ...(await startPullRequest(env, targetUrl, start.pullRequest)), signUpUsersDeleted });

  return json({ groups: await startGroups(env, FULL, { targetUrl }), signUpUsersDeleted });
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

async function call<T>(env: HostEnv, path: string, schema: z.ZodType<T>, body: unknown): Promise<T> {
  if (!env.TESTERARMY_API_KEY) throw new Error('the host has no TESTERARMY_API_KEY');
  const what = `TesterArmy POST ${path}`;
  const response = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.TESTERARMY_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const answer = await response.text();
  if (!response.ok) throw new Error(`${what} -> ${response.status}: ${answer.slice(0, 300)}`);

  return decode(schema, answer, what);
}
