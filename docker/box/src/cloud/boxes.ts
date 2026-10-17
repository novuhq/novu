// The host's /__box/boxes routes, for whoever may call /__box/* (shared/auth.ts): the one way boxes' Workers are
// created and deleted, through the Cloudflare API, so CI needs no Cloudflare credentials. The host holds
// CLOUDFLARE_API_TOKEN as a secret no box gets. Deleting a box stops it first; when it can't be stopped, its Worker
// stays, so the box isn't left running unreachable.

import * as z from 'zod';
import { authorize } from '../shared/auth.ts';
import { CloudflareAnswer, fromJson, ScriptList } from '../shared/contracts.ts';
import { messageOf } from '../shared/errors.ts';
import { boxWorker, COMPATIBILITY_DATE, HOST, ROUTER } from '../shared/names.ts';
import type { HostEnv } from './env.ts';
import { json, text } from './life.ts';

const NAME = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/;
const RESERVED = [HOST, ROUTER];

export async function boxes(request: Request, env: HostEnv, url: URL): Promise<Response> {
  try {
    return await route(request, env, url);
  } catch (error) {
    return text(`${messageOf(error)}\n`, 500);
  }
}

async function route(request: Request, env: HostEnv, url: URL): Promise<Response> {
  if (!(await authorize(request))) return text("needs the same Authorization as a box's /__box/*\n", 401);
  if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID)
    return text('the host has no CLOUDFLARE_API_TOKEN; deploy it with ~/.config/novu-box/cloudflare.env\n', 501);
  if (request.method === 'GET' && url.pathname === '/__box/boxes') return json({ boxes: await list(env) });
  const box = url.pathname.slice('/__box/boxes/'.length);
  if (!NAME.test(box) || RESERVED.includes(boxWorker(box))) return text(`not a box name: ${box}\n`, 400);
  const origin = `https://${boxWorker(box)}.${url.hostname.slice(HOST.length + 1)}`;
  if (request.method === 'PUT') {
    await upload(env, box);

    return json({ box, origin });
  }
  if (request.method !== 'DELETE') return text('not found\n', 404);
  const destroyed = await env.BOX.get(env.BOX.idFromName(box)).fetch(`${origin}/__box/destroy`, { method: 'POST' });
  if (!destroyed.ok)
    return text(
      `stopping ${box} failed, so its Worker stays: ${destroyed.status} ${(await destroyed.text()).slice(0, 300)}\n`,
      502
    );
  await scripts(env, 'DELETE', `/${boxWorker(box)}?force=true`);

  return json({ box, state: 'deleted' });
}

async function list(env: HostEnv): Promise<Array<string>> {
  const answer = ScriptList.safeParse(await scripts(env, 'GET', ''));
  if (!answer.success) throw new Error(`Cloudflare's list of Workers: ${z.prettifyError(answer.error)}`);

  return answer.data
    .map((script) => script.id)
    .filter((name) => name.startsWith(boxWorker('')) && !RESERVED.includes(name))
    .map((name) => name.slice(boxWorker('').length))
    .sort();
}

// A Worker on workers.dev that forwards everything to Box(<box>) in the host (thin.ts, bundled by `box deploy`):
// its module, the binding to the host's class, BOX_NAME, then the workers.dev address.
async function upload(env: HostEnv, box: string): Promise<void> {
  const form = new FormData();
  form.append(
    'metadata',
    JSON.stringify({
      main_module: 'thin.js',
      compatibility_date: COMPATIBILITY_DATE,
      bindings: [
        { type: 'durable_object_namespace', name: 'BOX', class_name: 'Box', script_name: HOST },
        { type: 'plain_text', name: 'BOX_NAME', text: box },
      ],
      observability: { enabled: true },
    })
  );
  form.append('thin.js', new Blob([THIN_WORKER], { type: 'application/javascript+module' }), 'thin.js');
  await scripts(env, 'PUT', `/${boxWorker(box)}`, form);
  await scripts(
    env,
    'POST',
    `/${boxWorker(box)}/subdomain`,
    JSON.stringify({ enabled: true, previews_enabled: false })
  );
}

// The Workers Scripts API's `result`; deleting a Worker that isn't there counts as done.
async function scripts(env: HostEnv, method: 'GET' | 'PUT' | 'POST' | 'DELETE', path: string, body?: BodyInit) {
  const what = `Cloudflare ${method} workers/scripts${path.split('?')[0]}`;
  const headers: Record<string, string> = { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` };
  if (typeof body === 'string') headers['Content-Type'] = 'application/json';
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts${path}`,
    { method, headers, ...(body && { body }) }
  ).catch((error: unknown) => Promise.reject(new Error(`${what} -> ${String(error)}`)));
  if (method === 'DELETE' && response.status === 404) return null;
  const answer = fromJson(CloudflareAnswer).safeParse(await response.text());
  if (!answer.success || !answer.data.success)
    throw new Error(
      `${what} -> ${response.status}: ${JSON.stringify(answer.data?.errors ?? answer.data ?? null).slice(0, 300)}`
    );

  return answer.data.result;
}
