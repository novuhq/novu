// The host's own routes, at https://novu-box-core.<workers.dev subdomain>, for whoever may call /__box/*
// (shared/auth.ts): the one way boxes' Workers are created and deleted (`box --cloud` and CI, src/cli/cloud.ts),
// through the Cloudflare API, so CI (.github/workflows/novu-box.yml) needs no Cloudflare credentials. The host holds
// CLOUDFLARE_API_TOKEN (Workers Scripts: Edit) as a secret no box gets.
//
//   GET    /__box/boxes        {boxes: [name, ...]}, every novu-box-<name> Worker but the host's and the router's
//   PUT    /__box/boxes/<box>  upload the box's Worker (thin.ts) and put it on workers.dev; then `up` it through it
//   DELETE /__box/boxes/<box>  stop the box and forget it (Box.destroy), then delete its Worker; 502 and the Worker
//                              stays when the box couldn't be stopped
//
// The Slack router's address isn't here: alchemy.run.ts deploys it with the host.

import thin from 'virtual:thin';
import { Effect, Schema } from 'effect';
import { FetchHttpClient, HttpClient, HttpClientRequest } from 'effect/http';
import { authorize } from '../shared/auth.ts';
import { boxWorker, COMPATIBILITY_DATE, HOST, ROUTER } from '../shared/names.ts';
import type { HostEnv } from './env.ts';
import { attempt, runPromise } from './run.ts';

const NAME = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/;
const RESERVED = [HOST, ROUTER];

class CloudflareFailed extends Schema.TaggedError<CloudflareFailed>()('CloudflareFailed', {
  message: Schema.String,
}) {}

const ApiAnswer = Schema.Struct({
  success: Schema.Boolean,
  errors: Schema.optional(Schema.Unknown),
  result: Schema.optional(Schema.Unknown),
});
const ScriptList = Schema.Array(Schema.Struct({ id: Schema.String }));

export function boxes(request: Request, env: HostEnv, url: URL): Promise<Response> {
  return runPromise(
    route(request, env, url).pipe(
      Effect.provide(FetchHttpClient.layer),
      Effect.catch((error) => Effect.succeed(text(`${error.message}\n`, 500)))
    )
  );
}

const route = Effect.fn('boxes')(function* (request: Request, env: HostEnv, url: URL) {
  if (!(yield* attempt('', () => authorize(request))))
    return text("needs the same Authorization as a box's /__box/*\n", 401);
  if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID)
    return text('the host has no CLOUDFLARE_API_TOKEN; deploy it with ~/.config/novu-box/cloudflare.env\n', 501);
  const box = url.pathname.slice('/__box/boxes/'.length);
  if (request.method === 'GET' && url.pathname === '/__box/boxes') return json({ boxes: yield* list(env) });
  if (!NAME.test(box) || RESERVED.includes(boxWorker(box))) return text(`not a box name: ${box}\n`, 400);
  const origin = `https://${boxWorker(box)}.${url.hostname.slice(HOST.length + 1)}`;
  if (request.method === 'PUT') {
    yield* upload(env, box);

    return json({ box, origin });
  }
  if (request.method === 'DELETE') {
    const destroyed = yield* attempt('', () =>
      env.BOX.get(env.BOX.idFromName(box)).fetch(new Request(`${origin}/__box/destroy`, { method: 'POST' }))
    );
    if (!destroyed.ok)
      return text(
        `stopping ${box} failed, so its Worker stays: ${destroyed.status} ${(yield* attempt('', () => destroyed.text())).slice(0, 300)}\n`,
        502
      );
    yield* scripts(env, 'DELETE', `/${boxWorker(box)}?force=true`);

    return json({ box, state: 'deleted' });
  }

  return text('not found\n', 404);
});

const list = Effect.fn('list')(function* (env: HostEnv) {
  const names = (yield* Schema.decodeUnknownEffect(ScriptList)(yield* scripts(env, 'GET', ''))).map(
    (script) => script.id
  );

  return names
    .filter((name) => name.startsWith(boxWorker('')) && !RESERVED.includes(name))
    .map((name) => name.slice(boxWorker('').length))
    .sort();
});

// A Worker on workers.dev that forwards everything to Box(<box>) in the host (thin.ts, bundled by alchemy.run.ts):
// its module, the binding to the host's class, BOX_NAME, then the workers.dev address.
const upload = Effect.fn('upload')(function* (env: HostEnv, box: string) {
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
  form.append('thin.js', new Blob([thin], { type: 'application/javascript+module' }), 'thin.js');
  yield* scripts(env, 'PUT', `/${boxWorker(box)}`, (request) => HttpClientRequest.bodyFormData(request, form));
  yield* scripts(env, 'POST', `/${boxWorker(box)}/subdomain`, (request) =>
    HttpClientRequest.bodyJsonUnsafe(request, { enabled: true, previews_enabled: false })
  );
});

// The Workers Scripts API; deleting a Worker that isn't there counts as done.
const scripts = Effect.fn('scripts')(function* (
  env: HostEnv,
  method: 'GET' | 'PUT' | 'POST' | 'DELETE',
  path: string,
  body: (request: HttpClientRequest.HttpClientRequest) => HttpClientRequest.HttpClientRequest = (request) => request
) {
  const client = yield* HttpClient.HttpClient;
  const what = `Cloudflare ${method} workers/scripts${path.split('?')[0]}`;
  const failed = (message: string) => new CloudflareFailed({ message: `${what} -> ${message}` });
  const request = HttpClientRequest.make(method)(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts${path}`
  ).pipe(HttpClientRequest.bearerToken(env.CLOUDFLARE_API_TOKEN), body);
  const response = yield* client.execute(request).pipe(Effect.mapError((error) => failed(error.message)));
  if (method === 'DELETE' && response.status === 404) return null;
  const answer = yield* response.json.pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(ApiAnswer)),
    Effect.orElseSucceed(() => ({ success: false, errors: undefined, result: undefined }))
  );
  if (!answer.success)
    return yield* failed(`${response.status}: ${JSON.stringify(answer.errors ?? answer).slice(0, 300)}`);

  return answer.result;
});

function text(body: string, status: number): Response {
  return new Response(body, { status, headers: { 'Content-Type': 'text/plain' } });
}

function json(body: unknown): Response {
  return new Response(`${JSON.stringify(body, null, 2)}\n`, { headers: { 'Content-Type': 'application/json' } });
}
