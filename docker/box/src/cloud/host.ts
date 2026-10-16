// Novu Box on Cloudflare, the host Worker `novu-box-core` (alchemy.run.ts): the Box class, one Durable Object per box
// that owns the box's container. Every box shares this class, its image and its secrets, so a new box starts from
// another box's snapshot as Cloudflare documents it (within one class). The host's own address only answers 404; each
// box has a thin Worker `novu-box-<box>` on workers.dev (thin.ts) that checks /__box/* callers and forwards to
// Box(<box>). `box --cloud` (src/cli) drives them; browsers reach a box through its thin Worker. The host's address
// also answers /__box/boxes, which lists, creates and deletes boxes' Workers (boxes.ts).
//
//   /__box/*   control, for GitHub users with push access to novuhq/novu and the Novu Box workflow (shared/auth.ts)
//     GET  /__box/state             the box's phase (see Box) and snapshot; doesn't count as activity
//     POST /__box/up?ref=next       start the box: wake it from its snapshot, or bake `ref` into a new one
//     POST /__box/exec              {cmd, cwd?, github?} run a command in the box and stream its output
//     PUT  /__box/file?path=<file>  write the request body to a file in the box
//     POST /__box/down              save the box to its snapshot and stop it
//     POST /__box/destroy           stop the box and forget it (its snapshot and settings)
//   anything else                   the box's one address (Caddy :18080): dashboard, API, socket, S3, Mailpit
// While the box saves, up, exec, file and the box's address answer 503 with Retry-After (and X-Box-Phase: saving).
//
// After an hour without requests the Durable Object saves the box to a snapshot and stops it; the next request
// wakes it (about 35 s). Cloudflare can't see what runs inside, so the Durable Object keeps the time itself, on a
// one-minute alarm, as in Cloudflare's "save a sandbox automatically" recipe.
//
// Slack: the router (slack/router.ts) runs here too, as the Router Durable Object, and each Box does its part through
// slack/box.ts, at the hooks marked `Slack:` below. A host deployed without the router's settings has no Slack.

import { DurableObject } from 'cloudflare:workers';
import { Context, Effect, Layer, Scheduler, Schema } from 'effect';
import { HttpRouter, HttpServer, HttpServerRequest, HttpServerResponse } from 'effect/http';
import { isOidc } from '../shared/auth.ts';
import {
  BoxState,
  type ErrorNote,
  ExecRequest,
  type LostNote,
  type Phase,
  type SlackAnswer,
  SlackEvent,
  type StateAnswer,
} from '../shared/contracts.ts';
import { BOX_CLI, bearer, detached, EXIT_MARK, HOST, SECRETS } from '../shared/names.ts';
import { boxes } from './boxes.ts';
import type { HostEnv } from './env.ts';
import { attempt, type Failure, log, messageOf, runPromise, store, stored, within } from './run.ts';
import { BoxSlack } from './slack/box.ts';

// Slack: the router's Durable Object class.
export { Router } from './slack/router.ts';

const PUBLIC_PORT = 18080;
const INSTANCE = 'standard-4';
const ALARM_MS = 60 * 1000;
// Past the longest save seen (over 6 minutes for a big disk): while the box saves, its alarm and inactivity timeout are
// set this far ahead, so neither stops it half saved.
const SAVE_MS = 20 * 60 * 1000;
// What the alarm gives a call into the box (a command, its API): a hung bridge or API mustn't stall the idle check.
const CALL_MS = 30 * 1000;
const RESUME_MS = 10 * 60 * 1000;

// How long the box waits without requests before it saves itself and stops (the IDLE_MINUTES var, default 60).
// The backstop, Cloudflare's inactivity timeout, is shorter, as in its autosave recipe: each alarm renews it, so it
// only stops the container (without a snapshot) when the alarms stop.
function idleMs(env: HostEnv): number {
  return Number(env.IDLE_MINUTES ?? 60) * 60 * 1000;
}

function backstopMs(env: HostEnv): number {
  return Math.min(10 * 60 * 1000, idleMs(env) / 2);
}

// exec() passes only PATH from the image, so the rest of its ENV (image/Dockerfile) is repeated here.
const IMAGE_ENV = {
  PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
  HOME: '/root',
  COREPACK_HOME: '/data/corepack',
  COREPACK_ENABLE_DOWNLOAD_PROMPT: '0',
  NX_DAEMON: 'false',
  NX_NO_CLOUD: 'true',
  WRANGLER_SEND_METRICS: 'false',
  pnpm_config_verify_deps_before_run: 'false',
  BOX_HOME: '/opt/box',
};
const START = ['tini', '--', ...BOX_CLI, 'start'];

// Something in the box's life that went wrong: a save, a missing token.
class BoxFailed extends Schema.TaggedError<BoxFailed>()('BoxFailed', { message: Schema.String }) {}

export default {
  fetch(request: Request, env: HostEnv): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/__box/boxes' || url.pathname.startsWith('/__box/boxes/')) return boxes(request, env, url);

    return Promise.resolve(
      new Response(`${HOST}: reach a box through its own Worker, novu-box-<box>\n`, { status: 404 })
    );
  },
} satisfies ExportedHandler<HostEnv>;

// The GitHub token a box's git fetches and CI lookup get: the host's read-only GITHUB_READ_TOKEN when it has one, so
// no caller's push-capable token reaches a box; else the caller's own. A workflow's OIDC token is no GitHub token.
function readToken(request: Request, env: HostEnv): Effect.Effect<string | undefined, BoxFailed> {
  if (env.GITHUB_READ_TOKEN) return Effect.succeed(env.GITHUB_READ_TOKEN);
  const token = bearer(request);
  if (isOidc(token))
    return Effect.fail(
      new BoxFailed({ message: 'the host has no GITHUB_READ_TOKEN; deploy it with ~/.config/novu-box/github.env' })
    );

  return Effect.succeed(token);
}

interface Snapshot {
  readonly id: string;
  readonly size?: number;
  readonly name?: string;
}

// A box's phase, stored once (storage `life`) with what goes with it, and returned by /__box/state:
//
//   new      no container and no snapshot; `up` bakes (`error` says why a bake or a run before it ended)
//   baking   the container bakes its first /data; `running` once /data/.baked.json is there
//   running  the container runs from its snapshot or its bake
//   saving   sleep() stops the processes and snapshots the disk; /__box/up, exec and file get 503 until it's done
//   asleep   stopped, with `snapshot`; the next request wakes it
//   lost     its snapshot couldn't be restored (`lost`); `up` bakes again
//
// Also: `snapshot` (the one to wake from), `saveTries` (a `down` waiting to save, or trying again), `error` (the last
// failed bake or save), `since` (when the phase began).
interface Life {
  readonly phase: Phase;
  readonly since?: number;
  readonly snapshot?: Snapshot | null;
  readonly saveTries?: number;
  readonly error?: typeof ErrorNote.Type | null;
  readonly lost?: typeof LostNote.Type | null;
}

function note(message: string): typeof ErrorNote.Type {
  return { at: new Date().toISOString(), message };
}

type StartFrom =
  | { readonly image: string; readonly entrypoint: ReadonlyArray<string> }
  | { readonly containerSnapshot: Snapshot; readonly entrypoint: ReadonlyArray<string> };

interface RunOptions {
  readonly cwd?: string | undefined;
  readonly github?: string | undefined;
  // 'pipe': the caller writes stdin, and the command's output is dropped.
  readonly stdin?: 'pipe' | undefined;
  readonly signal?: AbortSignal;
}

// What the control routes below ask of the Box whose request they serve.
interface Control {
  readonly state: () => Effect.Effect<unknown, Failure>;
  readonly down: () => Effect.Effect<StateAnswer, Failure>;
  readonly destroy: () => Effect.Effect<StateAnswer, Failure>;
  readonly phase: () => Effect.Effect<Phase, Failure>;
  readonly running: () => boolean;
  readonly up: (request: Request, url: URL) => Effect.Effect<StateAnswer, Failure>;
  readonly exec: (request: Request) => Effect.Effect<Response, Failure>;
  readonly file: (request: Request, url: URL) => Effect.Effect<Response, Failure>;
}

class BoxControl extends Context.Service<BoxControl, Control>()('cloud/BoxControl') {}

type Handler = (box: Control, request: Request, url: URL) => Effect.Effect<Response, Failure>;

const handle = (f: Handler) =>
  Effect.gen(function* () {
    const box = yield* BoxControl;
    const request = (yield* HttpServerRequest.HttpServerRequest).source as Request;
    const response = yield* f(box, request, new URL(request.url)).pipe(
      Effect.catch((error) => Effect.succeed(new Response(`${error.message}\n`, { status: 500 })))
    );

    return HttpServerResponse.raw(response);
  });

const unlessSaving =
  (f: Handler): Handler =>
  (box, request, url) =>
    Effect.flatMap(box.phase(), (phase) =>
      phase === 'saving' ? Effect.succeed(saving(request)) : f(box, request, url)
    );

const whenRunning = (f: Handler): Handler =>
  unlessSaving((box, request, url) =>
    box.running()
      ? f(box, request, url)
      : Effect.succeed(new Response('the box is not running: `box up --cloud`\n', { status: 409 }))
  );

const control = HttpRouter.toWebHandler(
  Layer.mergeAll(
    HttpRouter.add(
      'GET',
      '/__box/state',
      handle((box) => Effect.map(box.state(), json))
    ),
    HttpRouter.add(
      'POST',
      '/__box/down',
      handle((box) => Effect.map(box.down(), json))
    ),
    HttpRouter.add(
      'POST',
      '/__box/destroy',
      handle((box) => Effect.map(box.destroy(), json))
    ),
    HttpRouter.add(
      'POST',
      '/__box/up',
      handle(unlessSaving((box, request, url) => Effect.map(box.up(request, url), json)))
    ),
    HttpRouter.add('POST', '/__box/exec', handle(whenRunning((box, request) => box.exec(request)))),
    HttpRouter.add('PUT', '/__box/file', handle(whenRunning((box, request, url) => box.file(request, url)))),
    HttpRouter.add(
      '*',
      '/__box/*',
      handle(() => Effect.succeed(new Response('not found\n', { status: 404 })))
    )
  ).pipe(
    Layer.provide(HttpServer.layerServices),
    Layer.provideMerge(Layer.succeed(Scheduler.Scheduler, new Scheduler.MixedScheduler('sync')))
  ),
  { disableLogger: true }
);

export class Box extends DurableObject<HostEnv> {
  // Goes up with each `destroy`, so a save that runs meanwhile writes nothing back.
  #generation = 0;
  #saving = false;
  #restoring: string | null = null;
  #lastActivity = 0;
  #persistedActivity = 0;
  readonly #slack: BoxSlack;
  readonly #control: Control;

  // The inactivity timeout doesn't survive a restart of this object, and every deploy restarts it: without this, a
  // running box would be stopped without a snapshot before its next alarm. An alarm a restart cut off (a save sets it
  // SAVE_MS ahead) is brought within a minute, since the timeout is shorter, and a save a restart cut off is
  // recovered at once (see `alarm`).
  constructor(ctx: DurableObjectState, env: HostEnv) {
    super(ctx, env);
    this.#slack = new BoxSlack({
      storage: ctx.storage,
      env,
      running: () => this.#container.running,
      phase: () => Effect.map(this.#current(), (life) => life.phase),
      wake: (origin) => this.#wake(origin),
      output: (cmd) => this.#output(cmd),
      port: () => this.#port(),
      touch: () => this.#touch(),
    });
    this.#control = {
      state: () => this.#state(),
      down: () => this.#sleepSoon(),
      destroy: () => this.#destroy(),
      phase: () => Effect.map(this.#current(), (life) => life.phase),
      running: () => this.#container.running,
      up: (request, url) => this.#up(request, url),
      exec: (request) => this.#exec(request),
      file: (request, url) => this.#file(request, url),
    };
    void ctx.blockConcurrencyWhile(() =>
      runPromise(
        Effect.gen({ self: this }, function* () {
          const { phase } = yield* this.#life();
          const running = this.#container.running;
          if (!running && phase !== 'saving') return;
          if (running) yield* attempt('', () => this.#container.setInactivityTimeout(backstopMs(env)));
          const soon = Date.now() + (phase === 'saving' ? 1000 : ALARM_MS);
          const alarm = yield* Effect.promise(() => ctx.storage.getAlarm());
          if (!alarm || alarm > soon) yield* Effect.promise(() => ctx.storage.setAlarm(soon));
        })
      )
    );
  }

  override fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    // Asking for the state isn't using the box; a poller would otherwise keep it awake forever.
    if (!(request.method === 'GET' && url.pathname === '/__box/state')) this.#touch();
    if (url.pathname.startsWith('/__box/')) return control.handler(request, Context.make(BoxControl, this.#control));

    return runPromise(
      this.#serve(request, url).pipe(
        Effect.catch((error) => Effect.succeed(new Response(`${error.message}\n`, { status: 500 })))
      )
    );
  }

  // Every 60 s while the box runs: after an hour without requests, and with no bake or apply running, it sleeps; after
  // a `down`, it sleeps once no bake or apply runs. The alarm and the inactivity timeout are renewed first, so nothing
  // below can leave the box to the timeout, which stops it without a snapshot.
  override alarm(): Promise<void> {
    return runPromise(
      Effect.gen({ self: this }, function* () {
        let life = yield* this.#current();
        if (life.phase === 'saving') {
          if (this.#saving) return;
          life = yield* this.#recoverSave();
        }
        if (!this.#container.running) {
          if (life.saveTries) yield* this.#setLife({ saveTries: 0 });

          return;
        }
        yield* attempt('', () => this.#container.setInactivityTimeout(backstopMs(this.env)));
        yield* this.#setAlarm(ALARM_MS);
        life = yield* this.#checkBake(life);
        if (!this.#container.running) return;
        const tries = life.saveTries ?? 0;
        if (tries) {
          yield* this.#sleep('down').pipe(
            Effect.matchEffect({
              onSuccess: (saved) =>
                saved.state === 'busy' ? log('down waits for the bake or apply that is running') : Effect.void,
              onFailure: (error) =>
                tries < 5
                  ? Effect.gen({ self: this }, function* () {
                      yield* log(`saving failed (try ${tries}): ${error.message}`);
                      yield* this.#setLife({ saveTries: tries + 1 });
                      yield* this.#setAlarm(10_000);
                    })
                  : this.#setLife({ saveTries: 0 }),
            })
          );

          return;
        }
        // Slack: connect the agents the bridge serves now.
        yield* this.#slack.connect().pipe(
          within(4 * CALL_MS, 'connecting Slack'),
          Effect.catch((error) => log(`slack not connected yet: ${error.message}`))
        );
        const last = Math.max(this.#lastActivity, (yield* stored<number>(this.ctx.storage, 'lastActivity')) ?? 0);
        if (Date.now() - last < idleMs(this.env)) return;
        yield* this.#sleep('idle').pipe(Effect.catch((error) => log(`saving failed: ${error.message}`)));
      })
    );
  }

  // RPC for the router, and GET /__box/state.
  state(): Promise<unknown> {
    return runPromise(this.#state());
  }

  // Slack: the router's RPC for an event to one of the box's agents.
  slackEvent(event: SlackEvent): Promise<SlackAnswer | null> {
    return runPromise(
      Effect.flatMap(Schema.decodeUnknownEffect(SlackEvent)(event), (decoded) => this.#slack.event(decoded))
    );
  }

  get #container(): Container {
    const container = this.ctx.container;
    if (!container) throw new Error('the Box class was deployed without its container');

    return container;
  }

  #life(): Effect.Effect<Life> {
    return Effect.map(
      stored<Life>(this.ctx.storage, 'life'),
      (life) => life ?? { phase: this.#container.running ? 'running' : 'new' }
    );
  }

  #setLife(changes: Partial<Life>): Effect.Effect<Life> {
    return Effect.gen({ self: this }, function* () {
      const life = yield* this.#life();
      const changed = changes.phase !== undefined && changes.phase !== life.phase;
      const next = { ...life, ...changes, ...(changed && { since: Date.now() }) };
      yield* store(this.ctx.storage, 'life', next);

      return next;
    });
  }

  #setAlarm(fromNowMs: number): Effect.Effect<void> {
    return Effect.promise(() => this.ctx.storage.setAlarm(Date.now() + fromNowMs));
  }

  // The stored phase, set right when the container went away without this object stopping it (the inactivity
  // backstop, a crash, a restart in the middle of a save).
  #current(): Effect.Effect<Life, Failure> {
    return Effect.gen({ self: this }, function* () {
      const life = yield* this.#life();
      const running = this.#container.running;
      if (!running && (life.phase === 'baking' || life.phase === 'running'))
        return yield* this.#setLife({
          phase: life.snapshot ? 'asleep' : 'new',
          error: note(`the container stopped while ${life.phase}, without a save`),
        });
      if (!running && life.phase === 'saving' && !this.#saving)
        return yield* this.#setLife({
          phase: life.snapshot ? 'asleep' : 'new',
          error: note('a restart cut the save off after the container stopped'),
        });
      // A save that a restart cut off after it stored the snapshot: what runs is the quiesced box it saved.
      if (running && life.phase === 'asleep' && !this.#saving)
        yield* attempt('', () => this.#container.destroy('saved'));

      return life;
    });
  }

  #serve(request: Request, url: URL): Effect.Effect<Response, Failure> {
    return Effect.gen({ self: this }, function* () {
      const life = yield* this.#current();
      if (life.phase === 'saving') return saving(request);
      if (!this.#container.running) {
        if (life.phase === 'lost')
          return new Response(
            `This box's snapshot ${life.lost?.id} couldn't be restored (snapshots expire 30 days after they were made or last restored). Bake it again: run \`box up --cloud\`.\n`,
            { status: 503 }
          );
        if (life.phase !== 'asleep')
          return new Response('This box is not set up yet: run `box up --cloud`.\n', { status: 503 });
        yield* this.#wake(url.origin);

        return waking(request);
      }
      // The port speaks plain HTTP. The host stays the public one, which S3 signatures and Clerk check.
      const inside = new URL(request.url);
      inside.protocol = 'http:';

      return yield* attempt('', () => this.#port().fetch(new Request(inside, request))).pipe(
        // The container is up but the box isn't serving yet (it starts in about 35 s).
        Effect.catch((error) => Effect.as(log(`box not serving yet: ${error.message}`), waking(request)))
      );
    });
  }

  #state() {
    return Effect.gen({ self: this }, function* () {
      const life = yield* this.#current();
      const { snapshot } = life;
      const gigabytes = snapshot?.size ? +(snapshot.size / 1e9).toFixed(2) : null;
      const lastActivity = this.#lastActivity || ((yield* stored<number>(this.ctx.storage, 'lastActivity')) ?? 0);

      return {
        phase: life.phase,
        since: life.since ? new Date(life.since).toISOString() : null,
        running: this.#container.running,
        snapshot: snapshot ? { id: snapshot.id, name: snapshot.name, gigabytes } : null,
        saveTries: life.saveTries ?? 0,
        error: life.error ?? null,
        lost: life.lost ?? null,
        lastActivity: new Date(lastActivity).toISOString(),
        origin: (yield* stored<string>(this.ctx.storage, 'origin')) ?? null,
        // Slack: the events the router handed to the box.
        ...(yield* this.#slack.state()),
      };
    });
  }

  // Wakes the box from its snapshot. The first time, it starts from another box's snapshot (`from`, its id) or
  // bakes `ref`; so does a box whose bake failed. The GitHub token (readToken) is in the bake's environment only;
  // `box start` runs without it.
  #up(request: Request, url: URL): Effect.Effect<StateAnswer, Failure> {
    return Effect.gen({ self: this }, function* () {
      yield* store(this.ctx.storage, 'origin', url.origin);
      const life = yield* this.#checkBake(yield* this.#current());
      if (this.#container.running) return { state: life.phase };
      const from = url.searchParams.get('from');
      if (from && !life.snapshot) yield* this.#setLife({ snapshot: { id: from, name: `from ${from}` } });
      if ((yield* this.#life()).snapshot) {
        yield* this.#wake(url.origin);

        return { state: 'waking' };
      }
      const ref = url.searchParams.get('ref') ?? 'next';
      const github = yield* readToken(request, this.env);
      const image = this.#container.images.BoxImage;
      if (!image) return yield* new BoxFailed({ message: `${HOST} was deployed without the box image` });
      yield* this.#start({ image, entrypoint: ['tini', '--', 'sleep', 'infinity'] });
      yield* this.#setLife({ phase: 'baking', error: null, lost: null });
      const bake = detached([...BOX_CLI, 'bake', ref, '--start'], '/data/logs/up.log');
      const process = yield* this.#run(bake, { github });
      yield* attempt('', () => process.exitCode);

      return { state: 'baking', ref };
    });
  }

  // A bake that ended without /data/.baked.json failed: its container goes, with the end of its log kept as the
  // error, so the next `up` bakes again. The bake takes its lock a moment after it starts, hence the minute's grace.
  #checkBake(life: Life): Effect.Effect<Life, Failure> {
    return Effect.gen({ self: this }, function* () {
      if (life.phase !== 'baking' || !this.#container.running || Date.now() - (life.since ?? 0) < 60_000) return life;
      const status = yield* this.#boxState().pipe(
        within(CALL_MS, 'the bake check'),
        Effect.map((state) => ({ baked: Boolean(state.baked), lock: Boolean(state.lock) })),
        Effect.catch((error) =>
          Effect.as(log(`${error.message}; the bake counts as running`), { baked: false, lock: true })
        )
      );
      if (status.baked) return yield* this.#setLife({ phase: 'running' });
      if (status.lock) return life;
      const tail = yield* this.#output(['tail', '-n', '5', '/data/logs/up.log']).pipe(
        within(CALL_MS, 'the bake log'),
        Effect.orElseSucceed(() => '')
      );
      yield* attempt('', () => this.#container.destroy('the bake failed'));

      return yield* this.#setLife({ phase: 'new', error: note(`the bake failed: ${tail.slice(-600)}`) });
    });
  }

  #wake(origin: string): Effect.Effect<void, Failure> {
    return Effect.gen({ self: this }, function* () {
      if (this.#container.running) return;
      const { snapshot } = yield* this.#setLife({ phase: 'running' });
      if (!snapshot) return yield* new BoxFailed({ message: 'the box has no snapshot to wake from' });
      yield* this.#start({ containerSnapshot: snapshot, entrypoint: START }, origin);
      this.#watchRestore(snapshot);
    });
  }

  // Snapshots expire 30 days after they were made or last restored, and nothing extends them. A restore that fails
  // stops the container before the box ever answers, without an exit code; then the snapshot is forgotten (kept as
  // `lost`) so `up` bakes again instead of retrying a dead id forever. Once the box has answered (`run`), its
  // snapshot was restored, and a later stop says nothing about it.
  #watchRestore(snapshot: Snapshot): void {
    this.#restoring = snapshot.id;
    this.#container.monitor().catch((error: unknown) =>
      runPromise(
        Effect.gen({ self: this }, function* () {
          const exited = typeof (error as { exitCode?: unknown }).exitCode === 'number';
          if (this.#restoring !== snapshot.id || !(error instanceof Error) || exited) return;
          if ((yield* this.#life()).snapshot?.id !== snapshot.id) return;
          yield* log(`restoring snapshot ${snapshot.id} failed, so it is forgotten: ${error.message}`);
          yield* this.#setLife({
            phase: 'lost',
            snapshot: null,
            lost: { id: snapshot.id, at: new Date().toISOString(), message: error.message },
          });
        })
      )
    );
  }

  #start(from: StartFrom, origin?: string): Effect.Effect<void, Failure> {
    return Effect.gen({ self: this }, function* () {
      // Slack: what the box's agents had in the last container.
      yield* this.#slack.reset();
      // Before the start: a first restore can outlast the caller (4 to 6 minutes), and the alarm is what puts the box
      // to sleep.
      yield* this.#setAlarm(ALARM_MS);
      const base = { instance: INSTANCE, enableInternet: true, env: yield* this.#boxEnv(origin) } as const;
      const entrypoint = [...from.entrypoint];
      const options: ContainerStartupOptions =
        'image' in from
          ? { ...base, entrypoint, image: from.image }
          : { ...base, entrypoint, containerSnapshot: from.containerSnapshot };
      yield* Effect.try({
        try: () => this.#container.start(options),
        catch: (error) => new BoxFailed({ message: `start: ${messageOf(error)}` }),
      });
      yield* attempt('', () => this.#container.setInactivityTimeout(backstopMs(this.env)));
      this.#touch();
    });
  }

  // A restart of this object (a deploy) cut a save off while the container ran: whatever the save had stopped
  // starts again, and the box runs on until its next save.
  #recoverSave(): Effect.Effect<Life> {
    return Effect.gen({ self: this }, function* () {
      yield* log('a restart cut the save off; resuming the box');
      const resumed = yield* this.#resume();

      return yield* this.#setLife({
        phase: 'running',
        error: note(`a restart cut the save off; resume exited ${resumed}`),
      });
    });
  }

  // `box resume`'s exit code, or why it has none.
  #resume(): Effect.Effect<number | string> {
    return this.#run([...BOX_CLI, 'resume']).pipe(
      Effect.flatMap((process) => attempt('', () => process.exitCode)),
      within(RESUME_MS, 'resume'),
      Effect.catch((error) => Effect.succeed(error.message))
    );
  }

  // Saving can outlast the request that asked for it (a big disk takes over 5 minutes), and a cancelled request
  // would stop the box without its snapshot; an alarm runs for up to 15 minutes on its own.
  #sleepSoon(): Effect.Effect<StateAnswer, Failure> {
    return Effect.gen({ self: this }, function* () {
      const life = yield* this.#current();
      if (!this.#container.running || life.phase === 'saving') return { state: life.phase };
      yield* this.#setLife({ saveTries: Math.max(1, life.saveTries ?? 0), error: null });
      yield* this.#setAlarm(1000);

      return { state: 'saving' };
    });
  }

  // Stops every process, the data stores last, so their files are whole, saves the disk to a snapshot, then stops the
  // container. A bake or apply that runs puts it off (`busy`). A box whose first bake never finished has nothing
  // worth saving. Anything else that goes wrong starts the stopped processes again and keeps the box running (with
  // its alarm, to try again): stopping without a snapshot loses everything since the last one. A `destroy` while it
  // runs wins: from then on it writes nothing.
  #sleep(reason: string): Effect.Effect<StateAnswer, Failure> {
    return Effect.gen({ self: this }, function* () {
      const container = this.#container;
      if (!container.running) return { state: 'stopped' };
      const generation = this.#generation;
      const destroyed = () => this.#generation !== generation;
      const write = (changes: Partial<Life>) => (destroyed() ? Effect.succeed(null) : this.#setLife(changes));
      const started = Date.now();
      const step = (what: string) => log(`sleep(${reason}) ${what} at ${Math.round((Date.now() - started) / 1000)}s`);
      const before = (yield* this.#life()).phase;
      // Kept set, not deleted: deleting the alarm inside alarm() can cancel its retry.
      const keepRunning = Effect.gen({ self: this }, function* () {
        if (destroyed()) return;
        yield* attempt('', () => container.setInactivityTimeout(backstopMs(this.env)));
        yield* this.#setAlarm(ALARM_MS);
      });
      const stateCheck = this.#boxState().pipe(within(CALL_MS, 'the state check'));
      let quiesced = false;
      this.#saving = true;

      const save = Effect.gen({ self: this }, function* () {
        yield* this.#setLife({ phase: 'saving' });
        yield* this.#setAlarm(SAVE_MS);
        yield* attempt('', () => container.setInactivityTimeout(SAVE_MS));
        const status = yield* stateCheck;
        if (status.lock) {
          yield* write({ phase: before });
          yield* keepRunning;

          return { state: 'busy' };
        }
        if (!status.baked) {
          yield* attempt('', () => container.destroy(reason));
          yield* write({
            phase: 'new',
            saveTries: 0,
            error: note('the bake never finished; stopped without a snapshot'),
          });
          yield* step('stopped');

          return { state: 'stopped without a snapshot (never baked)' };
        }
        quiesced = true;
        const quiesce = yield* this.#run([...BOX_CLI, 'quiesce']).pipe(
          Effect.flatMap((process) => attempt('', () => process.exitCode))
        );
        yield* step(`quiesce exited ${quiesce}`);
        if (quiesce !== 0) return yield* new BoxFailed({ message: `quiesce exited ${quiesce}` });
        // A bake or apply whose exec came in just before the save began holds its lock by now.
        if ((yield* stateCheck).lock)
          return yield* new BoxFailed({ message: 'a bake or apply started as the save began' });
        const snapshot = yield* attempt('', () => container.snapshotContainer({ name: 'box' }));
        if (!snapshot?.id) return yield* new BoxFailed({ message: 'the snapshot came back without an id' });
        yield* step(`snapshot ${snapshot.id} (${snapshot.size ?? '?'} bytes)`);
        if (!(yield* write({ phase: 'asleep', snapshot, saveTries: 0, error: null }))) return { state: 'deleted' };
        yield* attempt('', () => container.destroy(reason));
        yield* step('stopped');

        return { state: 'asleep', snapshot: snapshot.id };
      });

      return yield* save.pipe(
        Effect.catchDefect((defect) => Effect.fail(new BoxFailed({ message: messageOf(defect) }))),
        Effect.catch((error) =>
          Effect.gen({ self: this }, function* () {
            if (destroyed()) return { state: 'deleted' };
            yield* step(`failed, the box keeps running: ${error.message}`);
            if (container.running && quiesced) yield* step(`resume exited ${yield* this.#resume()}`);
            yield* write({ phase: before, error: note(error.message) });
            if (container.running) yield* keepRunning;

            return yield* Effect.fail(error);
          })
        ),
        Effect.ensuring(
          Effect.sync(() => {
            this.#saving = false;
          })
        )
      );
    });
  }

  // For a deleted box: the Durable Object's storage goes too, so the name starts from nothing if it's used again.
  #destroy(): Effect.Effect<StateAnswer, Failure> {
    return Effect.gen({ self: this }, function* () {
      this.#generation++;
      // Slack: the router forgets the box and its agents.
      yield* this.#slack.unregister();
      if (this.#container.running) yield* attempt('', () => this.#container.destroy('deleted'));
      yield* Effect.promise(() => this.ctx.storage.deleteAlarm());
      yield* Effect.promise(() => this.ctx.storage.deleteAll());

      return { state: 'deleted' };
    });
  }

  #exec(request: Request): Effect.Effect<Response, Failure> {
    return Effect.gen({ self: this }, function* () {
      const body = yield* attempt('the request', () => request.json());
      const { cmd, cwd, github } = yield* Schema.decodeUnknownEffect(ExecRequest)(body);
      const token = github ? yield* readToken(request, this.env) : undefined;

      return streamed(yield* this.#run(cmd, { cwd, github: token }));
    });
  }

  #file(request: Request, url: URL): Effect.Effect<Response, Failure> {
    return Effect.gen({ self: this }, function* () {
      const path = url.searchParams.get('path') ?? '';
      // An exec whose stdin is the request's body often never answers, though the file is written whole (October
      // 2026: 12 of 16 tries); writing the bytes to a piped stdin answers every time.
      const bytes = yield* attempt('the request', () => request.bytes());
      const process = yield* this.#run(['sh', '-c', 'cat > "$0"', path], { stdin: 'pipe' });
      yield* attempt('', async () => {
        const writer = process.stdin?.getWriter();
        await writer?.write(bytes);
        await writer?.close();
      });
      const exitCode = yield* attempt('', () => process.exitCode);

      return json({ path, exitCode }, exitCode === 0 ? 200 : 500);
    });
  }

  // The box's one address (Caddy), from inside the Worker.
  #port(): Fetcher {
    return this.#container.getTcpPort(PUBLIC_PORT);
  }

  // What `box state` says: the baked and applied commits, and the bake or apply holding the lock.
  #boxState(): Effect.Effect<typeof BoxState.Type, Failure> {
    return Effect.flatMap(
      this.#output([...BOX_CLI, 'state']),
      Schema.decodeUnknownEffect(Schema.fromJsonString(BoxState))
    );
  }

  // A read-only command's output; a timeout around it also stops the command.
  #output(cmd: ReadonlyArray<string>): Effect.Effect<string, Failure> {
    return Effect.suspend(() => {
      const controller = new AbortController();

      return Effect.gen({ self: this }, function* () {
        const process = yield* this.#run(cmd, { signal: controller.signal });
        const output = yield* attempt('', () => process.output());

        return new TextDecoder().decode(output.stdout).trim();
      }).pipe(Effect.onInterrupt(() => Effect.sync(() => controller.abort())));
    });
  }

  #run(cmd: ReadonlyArray<string>, { cwd, github, stdin, signal }: RunOptions = {}) {
    return Effect.gen({ self: this }, function* () {
      const env = { ...IMAGE_ENV, ...(yield* this.#boxEnv()), ...(github && { GITHUB_TOKEN: github }) };
      const process = yield* attempt('', () =>
        this.#container.exec([...cmd], {
          env,
          ...(stdin ? { stdin, stdout: 'ignore', stderr: 'ignore' } : { stderr: 'combined' }),
          ...(cwd && { cwd }),
          ...(signal && { signal }),
        })
      );
      this.#restoring = null;

      return process;
    });
  }

  // The secrets and the box's public URLs, for the box and for every command run in it (an apply that rebuilds the
  // dashboard writes these URLs into it).
  #boxEnv(origin?: string): Effect.Effect<Record<string, string>> {
    return Effect.gen({ self: this }, function* () {
      const base = origin ?? (yield* stored<string>(this.ctx.storage, 'origin'));
      const secrets = {
        ...Object.fromEntries(SECRETS.flatMap((name) => (this.env[name] ? [[name, this.env[name]]] : []))),
        // Slack: the box's Slack API, the router.
        ...this.#slack.env(),
      };
      if (!base) return secrets;

      return {
        ...secrets,
        API_ROOT_URL: base,
        FRONT_BASE_URL: base,
        DASHBOARD_URL: base,
        VITE_API_HOSTNAME: base,
        VITE_DASHBOARD_URL: base,
        VITE_WEBSOCKET_HOSTNAME: `${base.replace(/^http/, 'ws')}/ws`,
        S3_LOCAL_STACK: base,
        CDN_URL: `${base}/cdn`,
      };
    });
  }

  #touch(): void {
    const now = Date.now();
    this.#lastActivity = now;
    if (now - this.#persistedActivity > 60 * 1000) {
      this.#persistedActivity = now;
      void this.ctx.storage.put('lastActivity', now);
    }
  }
}

// The command's output as it comes, then a last line with its exit code, which the CLI reads.
function streamed(process: ExecProcess): Response {
  const { readable, writable } = new TransformStream();
  const finish = async () => {
    await process.stdout?.pipeTo(writable, { preventClose: true }).catch(() => {});
    const writer = writable.getWriter();
    await writer.write(new TextEncoder().encode(`\n${EXIT_MARK} ${await process.exitCode}\n`));
    await writer.close();
  };
  // A client that disconnects only stops the stream; the command keeps running.
  finish().catch(() => {});

  return new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

// While the box saves (3 to 6 minutes), for browsers and for the CLI and CI, which wait and ask again.
function saving(request: Request): Response {
  const headers = { 'Retry-After': '30', 'X-Box-Phase': 'saving' };
  if (request.headers.get('Accept')?.includes('text/html'))
    return new Response(
      '<!doctype html><meta http-equiv="refresh" content="30"><title>Saving</title><p>This Novu Box is saving to its snapshot (3 to 6 minutes), then it wakes again. The page reloads by itself.</p>',
      { status: 503, headers: { ...headers, 'Content-Type': 'text/html' } }
    );

  return new Response('the box is saving to its snapshot; ask again in 30 s\n', { status: 503, headers });
}

function waking(request: Request): Response {
  if (request.headers.get('Accept')?.includes('text/html'))
    return new Response(
      '<!doctype html><meta http-equiv="refresh" content="5"><title>Waking up</title><p>This Novu Box is waking up (about 35 s). The page reloads by itself.</p>',
      { status: 503, headers: { 'Content-Type': 'text/html', 'Retry-After': '5' } }
    );

  return new Response('the box is waking up\n', { status: 503, headers: { 'Retry-After': '10' } });
}

function json(body: unknown, status = 200): Response {
  return new Response(`${JSON.stringify(body, null, 2)}\n`, {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
