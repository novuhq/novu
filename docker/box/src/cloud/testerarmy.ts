import * as z from 'zod';
import { authorize } from '../shared/auth.ts';
import { decode, TesterArmyStart } from '../shared/contracts.ts';
import { messageOf } from '../shared/errors.ts';
import { boxOrigin } from '../shared/names.ts';
import { liveBoxes } from './boxes.ts';
import { deleteSignUpUsers } from './clerk.ts';
import type { HostEnv } from './env.ts';
import { json, text } from './life.ts';

const API = 'https://tester.army/api/v1';
// TesterArmy's "Novu Box" project and its groups.
const PROJECT = '7face08e-82db-4350-bfa3-c4a736709f9c';
const CORE = { name: 'Box core', id: 'c59e6208-575b-40f1-acd7-394ea57afc66' };
const WORKFLOWS = { name: 'Box workflows', id: 'fef21e20-5d8a-4b3c-9f57-9105d6755035' };
// Its sign-ups share one inbox, so they don't run on every PR at once.
const ACCOUNTS = { name: 'Box accounts', id: '46526209-9574-46d7-8c88-490cdac79509' };
const PR_GROUPS = [CORE];
const NIGHTLY_GROUPS = [CORE, WORKFLOWS, ACCOUNTS];

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
  const { pullRequest } = decode(TesterArmyStart, await request.text(), 'the request');
  const targetUrl = boxOrigin(box);
  const signUpUsersDeleted = await deleteSignUpUsers(env);
  const exploration = pullRequest
    ? await call(env, `/projects/${PROJECT}/pull-request-runs`, PrRun, { targetUrl, platform: 'web', pullRequest })
    : undefined;
  const groups = [];
  for (const group of pullRequest ? PR_GROUPS : NIGHTLY_GROUPS) {
    const run = await call(env, `/groups/${group.id}/runs`, GroupRun, {
      targetUrl,
      ...(pullRequest && { prNumber: pullRequest.number, commitSha: pullRequest.commitSha }),
    });
    groups.push({ name: group.name, batchId: run.batchId, runs: run.queuedRunIds.length });
  }

  return json({ exploration, groups, signUpUsersDeleted });
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
