import { authorize } from '../shared/auth.ts';
import { messageOf } from '../shared/errors.ts';
import { boxOrigin, isBoxName } from '../shared/names.ts';
import { deleteBoxUsers } from './clerk.ts';
import type { HostEnv } from './env.ts';
import { json, text } from './life.ts';

export async function boxes(request: Request, env: HostEnv, url: URL): Promise<Response> {
  try {
    return await route(request, env, url);
  } catch (error) {
    return text(`${messageOf(error)}\n`, 500);
  }
}

const registry = (env: HostEnv) => env.REGISTRY.get(env.REGISTRY.idFromName('registry'));

async function route(request: Request, env: HostEnv, url: URL): Promise<Response> {
  if (!(await authorize(request, env))) return text("needs the same Authorization as a box's /__box/*\n", 401);
  if (request.method === 'GET' && url.pathname === '/__box/boxes') return json({ boxes: await liveBoxes(env) });
  const box = url.pathname.slice('/__box/boxes/'.length);
  if (!isBoxName(box))
    return text(`not a box name: ${box} (lowercase letters, digits and dashes; not slack, nor ending in -api)\n`, 400);
  const origin = boxOrigin(box);
  if (request.method === 'PUT') {
    const failed = (await registry(env).has(box)) ? null : await introduce(env, box);
    await registry(env).add(box);

    return json({ box, origin, ...(failed && { placed: false, warning: failed }) });
  }
  if (request.method !== 'DELETE') return text('not found\n', 404);
  // An unregistered box isn't created only to be destroyed: base creates it on `up`.
  const destroyed = (await registry(env).has(box))
    ? await env.BOX.get(env.BOX.idFromName(box)).fetch(`${origin}/__box/destroy`, { method: 'POST' })
    : null;
  if (destroyed && !destroyed.ok)
    return text(
      `stopping ${box} failed, so it stays: ${destroyed.status} ${(await destroyed.text()).slice(0, 300)}\n`,
      502
    );
  await registry(env).remove(box);
  registered.delete(box);

  return json({ box, state: 'deleted', ...(await deleteUsersOf(env, box)) });
}

// Before the box is registered, so no request reaches it first (see `Box.introduce`). Without base, or if base fails
// to, the box's first caller creates it. Returns why base failed.
async function introduce(env: HostEnv, box: string): Promise<string | null> {
  if (box === 'base' || !(await registry(env).has('base'))) return null;
  try {
    await env.BOX.get(env.BOX.idFromName('base')).introduce(box);

    return null;
  } catch (error) {
    console.log(`base couldn't create ${box}: ${messageOf(error)}`);

    return messageOf(error);
  }
}

// A user signed in to one box carries that box's Novu IDs in its Clerk metadata, so it must not outlive its box; a
// failure here still leaves the box deleted.
async function deleteUsersOf(env: HostEnv, box: string): Promise<{ users: Array<string>; usersError?: string }> {
  try {
    return { users: await deleteBoxUsers(env, box) };
  } catch (error) {
    console.log(`deleting ${box}'s test users failed: ${messageOf(error)}`);

    return { users: [], usersError: messageOf(error) };
  }
}

export function liveBoxes(env: HostEnv): Promise<Array<string>> {
  return registry(env).list();
}

// Per isolate, so most requests skip the Registry. A box deleted since is harmless: its Box answers 404 without an
// origin.
const registered = new Set<string>();

export async function isRegistered(env: HostEnv, box: string, { cached = true } = {}): Promise<boolean> {
  if (cached && registered.has(box)) return true;
  if (!(await registry(env).has(box))) return false;
  registered.add(box);

  return true;
}
