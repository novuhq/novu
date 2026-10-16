// `--cloud`: the box runs on Cloudflare in the host Worker (src/cloud/host.ts, shared by all boxes) and is reached
// through its own small Worker `novu-box-<box>` on workers.dev (src/cloud/thin.ts). The same commands as for a local
// box, over HTTPS, signed in with your GitHub token (`gh auth token`), or CI's OIDC token (src/ci).

import fs from 'node:fs';
import { Effect, Layer, Schema, Stream } from 'effect';
import { HttpClient, HttpClientRequest, type HttpClientResponse } from 'effect/http';
import type { ChildProcessSpawner } from 'effect/process';
import { BoxStatus, DoctorReport, StateAnswer } from '../shared/contracts.ts';
import { BOX_CLI, boxWorker, DOMAIN, EXIT_MARK, HOST } from '../shared/names.ts';
import { deployHost } from './deploy.ts';
import { CliError, pollUntil } from './run.ts';
import { type BoxCall, BoxTarget, type Target, type UpOptions } from './target.ts';

// A first bake takes 11 to 14 minutes on Cloudflare; a wake about 35 s, but the first restore of a snapshot 4 to 6
// minutes (the Slack router waits as long).
const READY_WITHIN_SECONDS = { baking: 25 * 60, waking: 8 * 60, running: 5 * 60 };

type Token = Effect.Effect<string, CliError>;

interface FetchInit {
  readonly method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readonly body?: string | Uint8Array;
}

const failure = (url: string) => (error: { readonly message: string }) =>
  new CliError({ message: `${url}: ${error.message}` });

const decode =
  <S extends Schema.Top & { readonly DecodingServices: never }>(schema: S, what: string) =>
  (response: HttpClientResponse.HttpClientResponse) =>
    Effect.flatMap(response.json, Schema.decodeUnknownEffect(schema)).pipe(
      Effect.mapError((error) => new CliError({ message: `${what}: ${error.message}` }))
    );

const send = Effect.fn('send')(function* (url: string, init: FetchInit, token: Token) {
  const client = yield* HttpClient.HttpClient;
  let request = HttpClientRequest.make(init.method ?? 'GET')(url).pipe(HttpClientRequest.bearerToken(yield* token));
  if (typeof init.body === 'string') request = HttpClientRequest.bodyText(request, init.body, 'application/json');
  else if (init.body) request = HttpClientRequest.bodyUint8Array(request, init.body);

  return yield* client.execute(request).pipe(Effect.mapError(failure(url)));
});

// The Worker's own answer, Cloudflare's HTML page (`missing` for its 404), or a box that saves.
function answerOf(response: HttpClientResponse.HttpClientResponse): 'own' | 'page' | 'missing' | 'saving' {
  if (response.headers['content-type']?.includes('text/html')) return response.status === 404 ? 'missing' : 'page';

  return response.status === 503 && response.headers['x-box-phase'] === 'saving' ? 'saving' : 'own';
}

// A request to a box's Worker or the host's routes, through what Cloudflare and the box answer while they can't yet:
// right after a deploy, an HTML page, a 404 (the new workers.dev name isn't live everywhere yet) or error 1042 (the
// host's class isn't reachable yet), for up to a minute; while a box saves, 503 with X-Box-Phase: saving, for up to
// 15 minutes. Cloudflare's 404 page means the Worker doesn't exist: null when `missing` is set.
const fetchThrough = Effect.fn('fetchThrough')(function* (
  url: string,
  init: FetchInit,
  token: Token,
  missing: boolean
) {
  const host = new URL(url).hostname;
  const savingUntil = Date.now() + 15 * 60_000;
  for (let pages = 0; ; ) {
    const response = yield* send(url, init, token);
    const answer = answerOf(response);
    if (answer === 'own') return response;
    if (answer === 'missing' && missing) return null;
    if (answer === 'saving') {
      if (Date.now() > savingUntil) return yield* new CliError({ message: `${host} is still saving after 15 minutes` });
      console.error(`[cli] ${host} is saving to its snapshot; waiting`);
      yield* Effect.sleep('15 seconds');
    } else {
      if (++pages === 45)
        return yield* new CliError({ message: `${url} answers Cloudflare's ${response.status} page after 90 s` });
      yield* Effect.sleep('2 seconds');
    }
  }
});

const boxFetch = (url: string, init: FetchInit, token: Token) =>
  Effect.flatMap(fetchThrough(url, init, token, false), (response) =>
    response ? Effect.succeed(response) : Effect.fail(new CliError({ message: `${url} doesn't exist` }))
  );

// The host's routes (src/cloud/boxes.ts): list, create and delete boxes' Workers.
export const hostBoxes = Effect.fn('hostBoxes')(function* <S extends Schema.Top & { readonly DecodingServices: never }>(
  path: string,
  schema: S,
  { method = 'GET', token }: { readonly method?: 'GET' | 'PUT' | 'DELETE'; readonly token: Token }
) {
  const url = `https://${HOST}.${DOMAIN}/__box/${path}`;
  const response = yield* boxFetch(url, { method }, token);
  if (response.status < 200 || response.status >= 300) {
    const body = yield* Effect.orElseSucceed(response.text, () => '');
    return yield* new CliError({
      message: `${method} ${HOST}/__box/${path} -> ${response.status}: ${body.slice(0, 300)}`,
    });
  }

  return yield* decode(schema, `${method} ${HOST}/__box/${path}`)(response);
});

// Why the box won't get ready, when its phase says so: its snapshot is lost, or it stopped (its bake failed).
function stuck(worker: string, current: BoxStatus | null): string | null {
  if (current?.phase === 'lost')
    return `${worker} couldn't restore snapshot ${current.lost?.id} (${current.lost?.message}); snapshots expire 30 days after they were made or last restored. Run \`up\` again to bake it`;
  if (current?.phase === 'new') return `${worker} stopped: ${current.error?.message ?? 'never started'}`;

  return null;
}

function readyWait(current: BoxStatus): keyof typeof READY_WITHIN_SECONDS {
  if (current.phase === 'baking') return 'baking';

  return current.running ? 'running' : 'waking';
}

export interface CloudOptions {
  readonly box: string;
  readonly token: Token;
  // Whether `up` deploys the host when it's missing (Alchemy, Docker and Cloudflare's login); CI can't.
  readonly mayDeployHost?: boolean;
  // No wait runs past it (CI's job time), in ms since the epoch.
  readonly deadline?: number;
}

export interface CloudTarget extends Target {
  // null only when the box's Worker doesn't exist; a failed request fails.
  readonly state: Effect.Effect<BoxStatus | null, CliError>;
  // `reachable`: any doctor answer will do, even a running box's, for an apply, which fixes or replaces what the
  // doctor finds.
  readonly readyFor: (options: { readonly reachable: boolean }) => Effect.Effect<void, CliError>;
  // The doctor's report once the box is fit, or its last one after `seconds`: what an apply left behind.
  readonly settled: (seconds: number) => Effect.Effect<DoctorReport | null, CliError>;
  // Any command in the box, its output collected; fails unless it exits 0.
  readonly runOutput: (cmd: ReadonlyArray<string>, options?: BoxCall) => Effect.Effect<string, CliError>;
}

export const cloudTarget = ({ box, token, mayDeployHost = true, deadline = Number.POSITIVE_INFINITY }: CloudOptions) =>
  Effect.gen(function* () {
    const services = yield* Effect.context<HttpClient.HttpClient | ChildProcessSpawner.ChildProcessSpawner>();
    const provide = <A, E>(
      effect: Effect.Effect<A, E, HttpClient.HttpClient | ChildProcessSpawner.ChildProcessSpawner>
    ): Effect.Effect<A, E> => Effect.provide(effect, services);
    const worker = boxWorker(box);
    const origin = `https://${worker}.${DOMAIN}`;
    const log = (message: string) => console.error(`[cli] ${message}`);

    // The box's answer, or its failure; 409 (the box isn't running) is the caller's to read.
    const checked = (path: string) => (response: HttpClientResponse.HttpClientResponse) =>
      (response.status >= 200 && response.status < 300) || response.status === 409
        ? Effect.succeed(response)
        : Effect.flatMap(
            Effect.orElseSucceed(response.text, () => ''),
            (body) =>
              Effect.fail(new CliError({ message: `${worker} ${path} -> ${response.status}: ${body.slice(0, 300)}` }))
          );

    const call = (path: string, init: FetchInit = {}) =>
      Effect.flatMap(boxFetch(`${origin}/__box${path}`, init, token), checked(path));

    // null only when the box's Worker doesn't exist (Cloudflare's 404 page).
    const state = Effect.flatMap(fetchThrough(`${origin}/__box/state`, {}, token, true), (response) =>
      response
        ? Effect.flatMap(checked('/state')(response), decode(BoxStatus, `${worker} /state`))
        : Effect.succeed(null)
    );

    // Streams a command's output to stdout (or collects it) and returns its exit code (or its output).
    const stream = Effect.fn('stream')(function* (
      body: { readonly cmd: ReadonlyArray<string>; readonly cwd?: string; readonly github?: boolean },
      capture: boolean
    ) {
      const response = yield* call('/exec', { method: 'POST', body: JSON.stringify(body) });
      if (response.status === 409)
        return yield* new CliError({ message: `${worker} isn't running: \`box up --cloud --box ${box}\`` });
      let text = '';
      let printed = 0;
      yield* response.stream.pipe(
        Stream.decodeText,
        Stream.runForEach((chunk) =>
          Effect.sync(() => {
            text += chunk;
            if (capture) return;
            // Holds back the last line, which may be the exit mark.
            const upTo = text.lastIndexOf('\n') + 1;
            if (upTo > printed) {
              process.stdout.write(text.slice(printed, upTo).replace(new RegExp(`\\n?${EXIT_MARK} \\d+\\n$`), ''));
              printed = upTo;
            }
          })
        ),
        Effect.mapError(failure(`${worker} /exec`))
      );
      const match = text.match(new RegExp(`\\n${EXIT_MARK} (\\d+)\\n?$`));
      const exitCode = match ? Number(match[1]) : 1;

      return { exitCode, output: text.slice(0, match?.index ?? text.length) };
    });

    const streamed = (body: Parameters<typeof stream>[0]) =>
      Effect.map(stream(body, false), (result) => result.exitCode);
    const collected = (body: Parameters<typeof stream>[0]) =>
      Effect.flatMap(stream(body, true), ({ exitCode, output }) =>
        exitCode === 0
          ? Effect.succeed(output.trim())
          : Effect.fail(
              new CliError({ message: `${body.cmd.join(' ')} exited with ${exitCode}: ${output.slice(-500)}` })
            )
      );

    const snapshotOf = Effect.fn('snapshotOf')(function* (name: string) {
      const response = yield* fetchThrough(`https://${boxWorker(name)}.${DOMAIN}/__box/state`, {}, token, true);
      if (!response?.headers['content-type']?.includes('json')) return null;

      return (yield* decode(BoxStatus, `${boxWorker(name)} /state`)(response)).snapshot?.id ?? null;
    });

    // The snapshot a new box starts from: `from`'s, or base's for a branch box that is new; none means bake.
    const startingSnapshot = Effect.fn('startingSnapshot')(function* (
      from: string | undefined,
      fromBase: boolean,
      ref: string
    ) {
      if (from) {
        const id = yield* snapshotOf(from);
        if (!id) return yield* new CliError({ message: `${boxWorker(from)} has no snapshot to start from` });

        return id;
      }
      const phase = (yield* state)?.phase ?? 'new';
      if (!fromBase || box === 'base' || !['new', 'lost'].includes(phase)) return null;
      const id = yield* snapshotOf('base');
      log(
        id
          ? `${worker} is new: starting it from ${boxWorker('base')}`
          : `no ${boxWorker('base')} snapshot: baking ${ref}`
      );

      return id;
    });

    // The host answers its own plain-text 404; Cloudflare's 404 page (HTML) means it isn't deployed.
    const hostExists = Effect.flatMap(HttpClient.HttpClient, (client) => client.get(`https://${HOST}.${DOMAIN}/`)).pipe(
      Effect.map(
        (response) => response.status === 404 && Boolean(response.headers['content-type']?.includes('text/plain'))
      ),
      Effect.orElseSucceed(() => false)
    );

    // The box's doctor report, or null while it can't give one (baking, starting).
    const doctor = collected({ cmd: ['sh', '-c', `${BOX_CLI.join(' ')} doctor || true`] }).pipe(
      Effect.flatMap(Schema.decodeUnknownEffect(Schema.fromJsonString(DoctorReport))),
      Effect.orElseSucceed(() => null)
    );

    // Asks the doctor every 10 s until `accept` takes its report, and returns that; fails when the box won't get there
    // (`stuck`), and after `seconds` or at the deadline. `orLast`: return the last report then instead (null if none).
    const waitFor = (
      seconds: number,
      accept: (report: DoctorReport) => boolean,
      { orLast = false }: { readonly orLast?: boolean } = {}
    ) => {
      const until = Math.min(Date.now() + seconds * 1000, deadline);
      let report: DoctorReport | null = null;
      const check = Effect.gen(function* () {
        const why = stuck(worker, yield* Effect.orElseSucceed(state, () => null));
        if (why) return yield* new CliError({ message: why });
        report = (yield* doctor) ?? report;

        return report && accept(report) ? report : undefined;
      });
      const when = until === deadline ? "the job's time is up" : `after ${seconds}s`;
      const timedOut = Effect.suspend(() =>
        orLast
          ? Effect.succeed(report)
          : Effect.fail(
              new CliError({
                message: `${worker} isn't ready (${when}): ${report?.problems.join('; ') ?? 'no doctor report'}`,
              })
            )
      );

      return pollUntil<DoctorReport | null, CliError, HttpClient.HttpClient>(check, {
        every: '10 seconds',
        until,
        orElse: timedOut,
      });
    };

    // 0 once the box stopped with a snapshot other than `previous`, 1 when it stopped without one.
    const waitUntilAsleep = (previous: string | undefined) => {
      const check = Effect.gen(function* () {
        // A request that fails doesn't mean the box stopped; ask again.
        const current = yield* Effect.orElseSucceed(state, () => null);
        if (current?.phase === 'running' && !current.saveTries && current.error)
          return yield* new CliError({
            message: `${worker} couldn't save, so it keeps running: ${current.error.message}`,
          });
        if (!current || current.running || current.phase === 'saving') return undefined;
        console.log(JSON.stringify({ state: current.phase, snapshot: current.snapshot?.id }));
        if (current.snapshot?.id && current.snapshot.id !== previous) return 0;
        log(`${worker} stopped WITHOUT a new snapshot: its next start bakes, or wakes from an older snapshot`);

        return 1;
      });

      return pollUntil(check, {
        every: '10 seconds',
        until: Date.now() + 15 * 60_000,
        orElse: Effect.fail(new CliError({ message: `${worker} is still saving after 15 minutes` })),
      });
    };

    // Wakes the box if it sleeps, and waits for its doctor to pass; a running box passes at once.
    const readyFor = Effect.fn('readyFor')(function* ({ reachable }: { readonly reachable: boolean }) {
      const current = yield* state;
      if (!current || current.phase === 'new' || current.phase === 'lost')
        return yield* new CliError({
          message: `${worker} ${current ? `isn't set up (${current.phase})` : "doesn't exist"}: \`box up --cloud --box ${box}\``,
        });
      if (current.phase === 'running' && current.running && !reachable) return;
      if (!current.running || current.phase === 'saving') {
        log(`${worker} is ${current.phase}; waking it`);
        yield* call('/up', { method: 'POST' });
      }
      yield* waitFor(READY_WITHIN_SECONDS[readyWait(current)], reachable ? () => true : (report) => report.ok);
    });

    const up = Effect.fn('up')(function* ({
      deploy: redeploy = false,
      ref = 'next',
      from,
      fromBase = false,
    }: UpOptions) {
      const query = new URLSearchParams({ ref });
      const snapshot = yield* startingSnapshot(from, fromBase, ref);
      if (snapshot) query.set('from', snapshot);
      // --deploy: a change to docker/box (image or Worker code) goes to the host, so to every box.
      if (redeploy || !(yield* hostExists)) {
        if (!mayDeployHost)
          return yield* new CliError({ message: `${HOST} isn't deployed; deploy it with \`box up --cloud --deploy\`` });
        yield* deployHost;
      }
      // Uploading the box's Worker is idempotent and takes about 2 s.
      log(`deploying ${worker}`);
      yield* hostBoxes(`boxes/${box}`, Schema.Unknown, { method: 'PUT', token });
      const { state: started } = yield* decode(
        StateAnswer,
        `${worker} /up`
      )(yield* call(`/up?${query}`, { method: 'POST' }));
      log(`${worker}: ${started}${started === 'baking' ? ` ${ref} (11 to 14 minutes)` : ''}`);
      const within = READY_WITHIN_SECONDS[started as keyof typeof READY_WITHIN_SECONDS] ?? READY_WITHIN_SECONDS.running;
      yield* waitFor(within, (report) => report.ok);
      log(`${worker} is ready`);
      console.log(`box: ${origin}`);
      console.log(`mailpit: ${origin}/mail`);

      return 0;
    });

    // Done when the box stopped with a snapshot newer than the one it had.
    const down = Effect.gen(function* () {
      const before = yield* state;
      if (!before) return yield* new CliError({ message: `${worker} doesn't exist` });
      if (!before.running) {
        log(`${worker} is already ${before.phase} (snapshot ${before.snapshot?.id ?? 'none'})`);

        return before.snapshot?.id ? 0 : 1;
      }
      log(
        `${worker}: saving to its snapshot and stopping (3 to 6 minutes, after a bake or apply that runs); the next request wakes it`
      );
      yield* call('/down', { method: 'POST' });

      return yield* waitUntilAsleep(before.snapshot?.id);
    });

    const target: CloudTarget = {
      name: worker,
      mailUrl: `${origin}/mail`,
      up: (options) => provide(up(options)),
      down: provide(down),
      // The host stops the box and forgets it (snapshot and settings), then deletes its Worker; when the box can't be
      // stopped, its Worker stays, so the box isn't left running unreachable. Other boxes are untouched.
      delete: provide(
        Effect.gen(function* () {
          log(`${worker}: stopping and forgetting the box, then deleting its Worker`);
          yield* hostBoxes(`boxes/${box}`, Schema.Unknown, { method: 'DELETE', token });

          return 0;
        })
      ),
      ready: provide(readyFor({ reachable: false })),
      readyFor: (options) => provide(readyFor(options)),
      settled: (seconds) => provide(waitFor(seconds, (report) => report.ok, { orLast: true })),
      state: provide(state),
      box: (args, { github = false } = {}) => provide(streamed({ cmd: [...BOX_CLI, ...args], github })),
      boxOutput: (args, { github = false } = {}) => provide(collected({ cmd: [...BOX_CLI, ...args], github })),
      runOutput: (cmd, { github = false } = {}) => provide(collected({ cmd, github })),
      exec: (cmd) => provide(streamed({ cmd, cwd: '/data/novu' })),
      put: (file, path) =>
        provide(
          Effect.asVoid(call(`/file?path=${encodeURIComponent(path)}`, { method: 'PUT', body: fs.readFileSync(file) }))
        ),
    };

    return target;
  });

export const layerCloud = (options: CloudOptions) => Layer.effect(BoxTarget, cloudTarget(options));
