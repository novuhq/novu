import { authorize } from '../shared/auth.ts';
import { messageOf } from '../shared/errors.ts';
import { boxOfTestUser } from '../shared/names.ts';
import { liveBoxes } from './boxes.ts';
import { createTestUser, deleteTestUser, testUsers, toPrune } from './clerk.ts';
import type { HostEnv } from './env.ts';
import { json, text } from './life.ts';

// Clerk's development instance holds 100 users, and every box shares it.
const PRUNE_AT = 50;

export async function users(request: Request, env: HostEnv, url: URL): Promise<Response> {
  try {
    return await route(request, env, url);
  } catch (error) {
    return text(`${messageOf(error)}\n`, 500);
  }
}

async function route(request: Request, env: HostEnv, url: URL): Promise<Response> {
  if (!(await authorize(request))) return text("needs the same Authorization as a box's /__box/*\n", 401);
  const name = decodeURIComponent(url.pathname.slice('/__box/users/'.length));
  if (request.method === 'GET' && !name) return list(env, Number(url.searchParams.get('limit') ?? PRUNE_AT));
  if (request.method === 'POST' && name) return create(env, name);
  if (request.method === 'DELETE' && name) return remove(env, name);

  return text('not found\n', 404);
}

async function list(env: HostEnv, limit: number): Promise<Response> {
  const [all, live] = await Promise.all([testUsers(env), liveBoxes(env)]);

  return json({
    users: all.map(({ email, box, createdAt }) => ({
      email,
      box,
      createdAt: new Date(createdAt).toISOString(),
      live: live.includes(box),
    })),
    prune: toPrune(all, live, limit).map((user) => user.email),
  });
}

async function create(env: HostEnv, box: string): Promise<Response> {
  const [all, live] = await Promise.all([testUsers(env), liveBoxes(env)]);
  if (!live.includes(box)) return text(`no box ${box}: \`box up --box ${box}\` first\n`, 404);
  const pruned = toPrune(all, live, PRUNE_AT);
  for (const user of pruned) await deleteTestUser(env, user);
  if (pruned.length) console.log(`deleted test users to make room: ${pruned.map((user) => user.email).join(', ')}`);
  const created = await createTestUser(env, box);

  return json({ ...created, pruned: pruned.map((user) => user.email) });
}

async function remove(env: HostEnv, email: string): Promise<Response> {
  if (!boxOfTestUser(email)) return text(`not a test user: ${email} (agent+<box>.<id>@novu.co)\n`, 400);
  const user = (await testUsers(env)).find((candidate) => candidate.email === email);
  if (!user) return text(`no test user ${email}\n`, 404);
  await deleteTestUser(env, user);

  return json({ deleted: email });
}
