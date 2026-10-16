// The host's own routes, at https://novu-box-host.<workers.dev subdomain>, for whoever may call /__box/* (auth.mjs):
// the one way boxes' Workers are created and deleted (cli.mjs --cloud and CI, cloud/target.mjs), through the Cloudflare
// API, so CI (.github/workflows/novu-box.yml) needs no Cloudflare credentials. The host holds CLOUDFLARE_API_TOKEN
// (Workers Scripts: Edit) as a secret no box gets.
//
//   GET    /__box/boxes        {boxes: [name, ...]}, every novu-box-<name> Worker but the host's and the router's
//   PUT    /__box/boxes/<box>  upload the box's Worker (thin.js) and put it on workers.dev; then `up` it through it
//   DELETE /__box/boxes/<box>  stop the box and forget it (Box.destroy), then delete its Worker; 502 and the Worker
//                              stays when the box couldn't be stopped
//   PUT    /__box/router       Slack: upload the Slack router's Worker (thin.js bound to Router("router"))

import { authorize } from './auth.mjs';
import { boxWorker, COMPATIBILITY_DATE, HOST, ROUTER } from './shared.mjs';

// The source of each of THIN_MODULES (shared.mjs), put in at deploy by target.mjs (wrangler `define`).
/* global THIN_SOURCES */
const NAME = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/;
const RESERVED = [HOST, ROUTER];

export async function boxes(request, env, url) {
  if (!(await authorize(request))) return text("needs the same Authorization as a box's /__box/*\n", 401);
  if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID)
    return text('the host has no CLOUDFLARE_API_TOKEN; deploy it with ~/.config/novu-box/cloudflare.env\n', 501);
  if (request.method === 'PUT' && url.pathname === '/__box/router') {
    if (!env.SLACK_ROUTER_URL) return text('the host has no Slack router settings\n', 501);
    await upload(env, ROUTER, { className: 'Router', objectName: 'router' });

    return json({ router: env.SLACK_ROUTER_URL });
  }
  const box = url.pathname.slice('/__box/boxes/'.length);
  if (request.method === 'GET' && url.pathname === '/__box/boxes') return json({ boxes: await list(env) });
  if (!NAME.test(box) || RESERVED.includes(boxWorker(box))) return text(`not a box name: ${box}\n`, 400);
  const origin = `https://${boxWorker(box)}.${url.hostname.slice(HOST.length + 1)}`;
  if (request.method === 'PUT') {
    await upload(env, boxWorker(box), { className: 'Box', objectName: box });

    return json({ box, origin });
  }
  if (request.method === 'DELETE') {
    const destroyed = await env.BOX.get(env.BOX.idFromName(box)).fetch(
      new Request(`${origin}/__box/destroy`, { method: 'POST' })
    );
    if (!destroyed.ok)
      return text(
        `stopping ${box} failed, so its Worker stays: ${destroyed.status} ${(await destroyed.text()).slice(0, 300)}\n`,
        502
      );
    await scripts(env, `/${boxWorker(box)}?force=true`, { method: 'DELETE' });

    return json({ box, state: 'deleted' });
  }

  return text('not found\n', 404);
}

async function list(env) {
  const names = (await scripts(env, '')).map((script) => script.id);

  return names
    .filter((name) => name.startsWith(boxWorker('')) && !RESERVED.includes(name))
    .map((name) => name.slice(boxWorker('').length))
    .sort();
}

// A Worker on workers.dev that forwards everything to one Durable Object in the host, Box(<box>) or the router
// (thin.js): its modules, the binding to the host's class, BOX_NAME, then the workers.dev address.
async function upload(env, worker, { className, objectName }) {
  const form = new FormData();
  form.append(
    'metadata',
    JSON.stringify({
      main_module: 'thin.js',
      compatibility_date: COMPATIBILITY_DATE,
      bindings: [
        { type: 'durable_object_namespace', name: 'BOX', class_name: className, script_name: HOST },
        { type: 'plain_text', name: 'BOX_NAME', text: objectName },
      ],
      observability: { enabled: true },
    })
  );
  for (const [name, source] of Object.entries(THIN_SOURCES))
    form.append(name, new Blob([source], { type: 'application/javascript+module' }), name);
  await scripts(env, `/${worker}`, { method: 'PUT', body: form });
  await scripts(env, `/${worker}/subdomain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled: true, previews_enabled: false }),
  });
}

// The Workers Scripts API; deleting a Worker that isn't there counts as done.
async function scripts(env, path, init = {}) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts${path}`,
    { ...init, headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`, ...init.headers } }
  );
  if (init.method === 'DELETE' && response.status === 404) return null;
  const body = await response.json().catch(() => ({}));
  if (!body.success)
    throw new Error(
      `Cloudflare ${init.method ?? 'GET'} workers/scripts${path.split('?')[0]} -> ${response.status}: ${JSON.stringify(body.errors ?? body).slice(0, 300)}`
    );

  return body.result;
}

function text(body, status) {
  return new Response(body, { status, headers: { 'Content-Type': 'text/plain' } });
}

function json(body) {
  return new Response(`${JSON.stringify(body, null, 2)}\n`, { headers: { 'Content-Type': 'application/json' } });
}
