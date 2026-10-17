// One box: its container, its phase (life.ts), its first bake (bake.ts) and its saves (sleep.ts). Requests reach it
// through its own Worker (thin.ts).

import { DurableObject } from 'cloudflare:workers';
import type { BoxStatus, StateAnswer } from '../shared/contracts.ts';
import { messageOf } from '../shared/errors.ts';
import { HOST } from '../shared/names.ts';
import { checkBake, startBake } from './bake.ts';
import {
  boxEnv,
  CALL_MS,
  execAnswer,
  execBody,
  fileAnswer,
  output,
  readToken,
  type Shell,
  START,
  withTimeout,
} from './container.ts';
import type { HostEnv } from './env.ts';
import {
  alarmIn,
  downOf,
  json,
  type Life,
  lifeOf,
  note,
  type Snapshot,
  saving,
  setLife,
  snapshotOf,
  status,
  stopped,
  text,
  waking,
  withDown,
} from './life.ts';
import {
  connectSlack,
  resetSlack,
  type SlackBox,
  slackEnv,
  slackEvent,
  slackState,
  unregisterSlack,
} from './slack/box.ts';
import type { SlackAnswer, SlackEvent, SlackEventNote } from './slack/types.ts';
import { ALARM_MS, backstopMs, idleMs, recoverSave, save } from './sleep.ts';

const PUBLIC_PORT = 18080;
const INSTANCE = 'standard-4';

type StartFrom = { readonly image: string } | { readonly containerSnapshot: Snapshot };

export class Box extends DurableObject<HostEnv> {
  // Goes up with each `destroy`, so a save that runs meanwhile writes nothing back.
  #generation = 0;
  // Set before a save's first await, so every request that comes in after it sees the save (the stored phase follows).
  #saving = false;
  #restoring: string | null = null;
  #lastActivity = 0;
  #persistedActivity = 0;
  readonly #container: Container;
  readonly #shell: Shell;
  readonly #slack: SlackBox;

  // The inactivity timeout doesn't survive a restart of this object, and every deploy restarts it: without this, a
  // running box would be stopped without a snapshot before its next alarm. An alarm a restart cut off (a save sets it
  // SAVE_MS ahead) is brought within a minute, since the timeout is shorter, and a save a restart cut off is
  // recovered at once (see `alarm`).
  constructor(ctx: DurableObjectState, env: HostEnv) {
    super(ctx, env);
    if (!ctx.container) throw new Error('the Box class was deployed without its container');
    this.#container = ctx.container;
    this.#shell = {
      container: ctx.container,
      env: () => this.#boxEnv(),
      answered: () => {
        this.#restoring = null;
      },
    };
    this.#slack = {
      storage: ctx.storage,
      env,
      running: () => this.#container.running,
      phase: async () => (await this.#reconcile()).phase,
      wake: (origin) => this.#wakeAsleep(origin),
      output: (cmd, what) => output(this.#shell, cmd, what),
      port: () => this.#port(),
      touch: () => this.#touch(),
      linked: new Set(),
      apiKey: null,
    };
    void ctx.blockConcurrencyWhile(() => this.#afterRestart());
  }

  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const route = `${request.method} ${url.pathname}`;
    // Asking for the state isn't using the box; a poller would otherwise keep it awake forever.
    if (route !== 'GET /__box/state') this.#touch();
    try {
      return await this.#route(route, request, url);
    } catch (error) {
      return text(`${messageOf(error)}\n`, 500);
    }
  }

  async #route(route: string, request: Request, url: URL): Promise<Response> {
    switch (route) {
      case 'GET /__box/state':
        return json(await this.state());
      case 'POST /__box/down':
        return json(await this.#sleepSoon());
      case 'POST /__box/destroy':
        return json(await this.#destroy());
      case 'POST /__box/up':
        return this.#unlessSaving(request, async () => json(await this.#up(request, url)));
      // The body is read before the save check: reading it lets the alarm in, which may begin a save.
      case 'POST /__box/exec': {
        const body = await execBody(request);
        if (body instanceof Response) return body;

        return this.#whenRunning(request, () => execAnswer(this.#shell, request, body, this.env));
      }
      case 'PUT /__box/file': {
        const bytes = await request.bytes();

        return this.#whenRunning(request, () => fileAnswer(this.#shell, url, bytes));
      }
    }
    if (url.pathname.startsWith('/__box/')) return text('not found\n', 404);

    return this.#unlessSaving(request, (life) => this.#serve(request, url, life));
  }

  // Every 60 s while the box runs: after an hour without requests, and with no bake or apply running, it sleeps; after
  // a `down`, it sleeps once no bake or apply runs. The alarm and the inactivity timeout are renewed first, so nothing
  // below can leave the box to the timeout, which stops it without a snapshot.
  override async alarm(): Promise<void> {
    const storage = this.ctx.storage;
    let life = await this.#reconcile();
    if (life.phase === 'saving') {
      // Alarms shouldn't overlap, so a save running here is unexpected; it keeps its own alarm, and this only makes
      // sure one stays set.
      if (this.#saving) return alarmIn(storage, ALARM_MS);
      life = await recoverSave(this.#shell, storage, life);
    }
    if (!this.#container.running) return;
    await this.#container.setInactivityTimeout(backstopMs(this.env));
    await alarmIn(storage, ALARM_MS);
    life = await checkBake(this.#shell, this.ctx.storage, life);
    if (!this.#container.running) return;
    const down = downOf(life);
    if (down) return this.#retrySave(down.tries);
    // Slack: connect the agents the bridge serves now.
    await withTimeout(connectSlack(this.#slack), 4 * CALL_MS, 'connecting Slack').catch((error: unknown) =>
      console.log(`slack not connected yet: ${messageOf(error)}`)
    );
    const last = Math.max(this.#lastActivity, (await storage.get<number>('lastActivity')) ?? 0);
    if (Date.now() - last < idleMs(this.env)) return;
    await this.#sleep('idle').catch((error: unknown) => console.log(`saving failed: ${messageOf(error)}`));
  }

  // RPC for the router, and GET /__box/state.
  async state(): Promise<BoxStatus & { slackEvents: ReadonlyArray<SlackEventNote> }> {
    const life = await this.#reconcile();
    const lastActivity = this.#lastActivity || ((await this.ctx.storage.get<number>('lastActivity')) ?? 0);
    const origin = (await this.ctx.storage.get<string>('origin')) ?? null;

    return { ...status(life, this.#container.running, lastActivity, origin), ...(await slackState(this.#slack)) };
  }

  // Slack: the router's RPC for an event to one of the box's agents.
  slackEvent(event: SlackEvent): Promise<SlackAnswer | null> {
    if (this.#saving) return Promise.resolve(null);

    return slackEvent(this.#slack, event);
  }

  async #afterRestart(): Promise<void> {
    const { phase } = await lifeOf(this.ctx.storage);
    const running = this.#container.running;
    if (!running && phase !== 'saving') return;
    if (running) await this.#container.setInactivityTimeout(backstopMs(this.env));
    const soon = Date.now() + (phase === 'saving' ? 1000 : ALARM_MS);
    const alarm = await this.ctx.storage.getAlarm();
    if (!alarm || alarm > soon) await this.ctx.storage.setAlarm(soon);
  }

  async #unlessSaving(request: Request, f: (life: Life) => Promise<Response>): Promise<Response> {
    if (this.#saving) return saving(request);
    const life = await this.#reconcile();

    return this.#saving || life.phase === 'saving' ? saving(request) : f(life);
  }

  #whenRunning(request: Request, f: () => Promise<Response>): Promise<Response> {
    return this.#unlessSaving(request, async () =>
      this.#container.running ? f() : text('the box is not running: `box up --cloud`\n', 409)
    );
  }

  // The stored phase, brought up to date (written, and a stray container destroyed) when the container went away
  // without this object stopping it (the inactivity backstop, a crash, a restart in the middle of a save).
  async #reconcile(): Promise<Life> {
    const storage = this.ctx.storage;
    const life = await lifeOf(storage);
    const running = this.#container.running;
    if (!running && (life.phase === 'baking' || life.phase === 'running'))
      return setLife(storage, stopped(life, `the container stopped while ${life.phase}, without a save`));
    if (!running && life.phase === 'saving' && !this.#saving)
      return setLife(storage, stopped(life, 'a restart cut the save off after the container stopped'));
    // A save that a restart cut off after it stored the snapshot: what runs is the quiesced box it saved.
    if (running && life.phase === 'asleep' && !this.#saving) await this.#container.destroy('saved');

    return life;
  }

  async #serve(request: Request, url: URL, life: Life): Promise<Response> {
    if (!this.#container.running) {
      if (life.phase === 'lost')
        return text(
          `This box's snapshot ${life.lost.id} couldn't be restored (snapshots expire 30 days after they were made or last restored). Bake it again: run \`box up --cloud\`.\n`,
          503
        );
      if (life.phase !== 'asleep') return text('This box is not set up yet: run `box up --cloud`.\n', 503);
      await this.#wake(url.origin, life.snapshot);

      return waking(request);
    }
    // The port speaks plain HTTP. The host stays the public one, which S3 signatures and Clerk check.
    const inside = new URL(request.url);
    inside.protocol = 'http:';
    try {
      const response = await this.#port().fetch(new Request(inside, request));
      // The box answered, so its snapshot was restored.
      this.#restoring = null;

      return response;
    } catch (error) {
      // The container is up but the box isn't serving yet (it starts in about 35 s).
      console.log(`box not serving yet: ${messageOf(error)}`);

      return waking(request);
    }
  }

  // Wakes the box from its snapshot. The first time, it starts from another box's snapshot (`from`, its id) or
  // bakes `ref`; so does a box whose bake failed. The GitHub token (readToken) is in the bake's environment only;
  // `box start` runs without it.
  async #up(request: Request, url: URL): Promise<StateAnswer> {
    await this.ctx.storage.put('origin', url.origin);
    const life = await checkBake(this.#shell, this.ctx.storage, await this.#reconcile());
    if (this.#container.running) return { state: life.phase };
    const from = url.searchParams.get('from');
    const snapshot = snapshotOf(life) ?? (from ? { id: from, name: `from ${from}` } : null);
    if (snapshot) {
      await this.#wake(url.origin, snapshot);

      return { state: 'waking' };
    }
    const ref = url.searchParams.get('ref') ?? 'next';
    const github = readToken(request, this.env);
    const image = this.#container.images.box;
    if (!image) throw new Error(`${HOST} was deployed without the box image`);
    await this.#start({ image }, ['tini', '--', 'sleep', 'infinity']);
    await startBake(this.#shell, this.ctx.storage, ref, github);

    return { state: 'baking', ref };
  }

  async #wakeAsleep(origin: string): Promise<void> {
    const snapshot = snapshotOf(await lifeOf(this.ctx.storage));
    if (snapshot) await this.#wake(origin, snapshot);
  }

  async #wake(origin: string, snapshot: Snapshot): Promise<void> {
    if (this.#container.running) return;
    await setLife(this.ctx.storage, {
      phase: 'running',
      since: Date.now(),
      snapshot,
      down: null,
      saveFailed: null,
    });
    await this.#start({ containerSnapshot: snapshot }, START, origin);
    this.#watchRestore(snapshot);
  }

  // Snapshots expire 30 days after they were made or last restored, and nothing extends them. A restore that fails
  // stops the container before the box ever answers, without an exit code; then the snapshot is forgotten (kept as
  // `lost`) so `up` bakes again instead of retrying a dead id forever. Once the box has answered (its address or a
  // command), its snapshot was restored, and a later stop says nothing about it.
  #watchRestore(snapshot: Snapshot): void {
    this.#restoring = snapshot.id;
    this.#container.monitor().catch(async (error: unknown) => {
      const exited = error instanceof Error && 'exitCode' in error && typeof error.exitCode === 'number';
      if (this.#restoring !== snapshot.id || !(error instanceof Error) || exited) return;
      if (snapshotOf(await lifeOf(this.ctx.storage))?.id !== snapshot.id) return;
      console.log(`restoring snapshot ${snapshot.id} failed, so it is forgotten: ${error.message}`);
      const lost = { id: snapshot.id, ...note(error.message) };
      await setLife(this.ctx.storage, { phase: 'lost', since: Date.now(), lost });
    });
  }

  async #start(from: StartFrom, entrypoint: Array<string>, origin?: string): Promise<void> {
    // Slack: what the box's agents had in the last container.
    await resetSlack(this.#slack);
    // Before the start: a first restore can outlast the caller (4 to 6 minutes), and the alarm is what puts the box
    // to sleep.
    await alarmIn(this.ctx.storage, ALARM_MS);
    const env = await this.#boxEnv(origin);
    try {
      this.#container.start({ instance: INSTANCE, enableInternet: true, env, entrypoint, ...from });
    } catch (error) {
      throw new Error(`start: ${messageOf(error)}`);
    }
    await this.#container.setInactivityTimeout(backstopMs(this.env));
    this.#touch();
  }

  // Saving can outlast the request that asked for it (a big disk takes over 5 minutes), and a cancelled request
  // would stop the box without its snapshot; an alarm runs for up to 15 minutes on its own.
  async #sleepSoon(): Promise<StateAnswer> {
    const storage = this.ctx.storage;
    const life = await this.#reconcile();
    if (!this.#container.running) return { state: life.phase };
    // During a save, too: it keeps the down if it comes back without saving (busy, failed).
    await setLife(storage, withDown(life, downOf(life) ?? { tries: 1 }));
    if (life.phase !== 'saving') await alarmIn(storage, 1000);

    return { state: 'saving' };
  }

  async #retrySave(tries: number): Promise<void> {
    try {
      const saved = await this.#sleep('down');
      if (saved.state === 'busy') console.log('down waits for the bake or apply that is running');
    } catch (error) {
      const again = tries < 5;
      if (again) console.log(`saving failed (try ${tries}): ${messageOf(error)}`);
      await setLife(this.ctx.storage, withDown(await lifeOf(this.ctx.storage), again ? { tries: tries + 1 } : null));
      if (again) await alarmIn(this.ctx.storage, 10_000);
    }
  }

  // A `destroy` while the save runs wins: from then on the save writes nothing.
  async #sleep(reason: string): Promise<StateAnswer> {
    if (!this.#container.running) return { state: 'stopped' };
    this.#saving = true;
    const generation = this.#generation;
    const destroyed = () => this.#generation !== generation;
    try {
      return await save({ shell: this.#shell, storage: this.ctx.storage, env: this.env, destroyed }, reason);
    } finally {
      this.#saving = false;
    }
  }

  // For a deleted box: the Durable Object's storage goes too, so the name starts from nothing if it's used again.
  async #destroy(): Promise<StateAnswer> {
    this.#generation++;
    // Slack: the router forgets the box and its agents.
    await unregisterSlack(this.#slack);
    if (this.#container.running) await this.#container.destroy('deleted');
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();

    return { state: 'deleted' };
  }

  // The box's one address (Caddy), from inside the Worker.
  #port(): Fetcher {
    return this.#container.getTcpPort(PUBLIC_PORT);
  }

  async #boxEnv(origin?: string): Promise<Record<string, string>> {
    return boxEnv(this.env, origin ?? (await this.ctx.storage.get<string>('origin')), slackEnv(this.#slack));
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
