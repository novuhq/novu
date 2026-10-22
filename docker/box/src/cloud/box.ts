import { DurableObject } from 'cloudflare:workers';
import { type BoxStatus, type LastStart, RESTORE_MS, type StateAnswer } from '../shared/contracts.ts';
import { messageOf } from '../shared/errors.ts';
import { boxOfHost, boxOrigin, HOST } from '../shared/names.ts';
import { checkBake, startBake } from './bake.ts';
import {
  boxEnv,
  CALL_MS,
  execAnswer,
  execBody,
  exitCode,
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

const TRACE = 'https://www.cloudflare.com/cdn-cgi/trace';

type StartFrom = { readonly image: string } | { readonly containerSnapshot: Snapshot };

// A snapshot restore, until the box first answers. `since` is the first attempt's start.
type Starting = { readonly since: number; readonly snapshot: Snapshot; readonly attempts: number };

const PROBE_EVERY_MS = 2000;

function coloOf(trace: string): string | undefined {
  return /^colo=(\w+)$/m.exec(trace)?.[1];
}

export class Box extends DurableObject<HostEnv> {
  #generation = 0;
  #saving = false;
  #starting: Starting | null = null;
  #colo: string | undefined;
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
      answered: () => this.#answered(),
    };
    this.#slack = {
      storage: ctx.storage,
      env,
      running: () => this.#container.running,
      starting: () => this.#starting !== null,
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
    const box = boxOfHost(url.hostname);
    if (!box) return text(`not a box address: ${url.hostname}\n`, 404);
    // Only a registered box's host reaches here, but an isolate's cache may still hold a deleted box, and `up`
    // registers a box before its `/up` stores `origin`: until then only `/__box/*` (authenticated) gets through.
    if (!url.pathname.startsWith('/__box/') && !(await this.ctx.storage.get('origin')))
      return text(`no such box: ${box}\n`, 404);
    const route = `${request.method} ${url.pathname}`;
    const isStatePoll = route === 'GET /__box/state';
    if (!isStatePoll) this.#touch();
    try {
      return await this.#route(route, request, url, boxOrigin(box));
    } catch (error) {
      return text(`${messageOf(error)}\n`, 500);
    }
  }

  // `origin` is the box's dashboard address, whichever of its hosts the request came to.
  async #route(route: string, request: Request, url: URL, origin: string): Promise<Response> {
    switch (route) {
      case 'GET /__box/state':
        if (!(await this.ctx.storage.get('origin'))) return text('no such box: `box up` creates it\n', 404);

        return json(await this.state());
      case 'POST /__box/down':
        return json(await this.#sleepSoon());
      case 'POST /__box/destroy':
        return json(await this.#destroy());
      case 'POST /__box/discard':
        return json(await this.#discard());
      case 'POST /__box/adopt':
        return json(await this.#adopt(url, origin));
      case 'POST /__box/up':
        return this.#unlessSaving(request, async () => json(await this.#up(url, origin)));
      // The body is read before the save check: reading it lets the alarm in, which may begin a save.
      case 'POST /__box/exec': {
        const body = await execBody(request);
        if (body instanceof Response) return body;

        return this.#whenRunning(request, () => execAnswer(this.#shell, body, this.env));
      }
      case 'PUT /__box/file': {
        const bytes = await request.bytes();

        return this.#whenRunning(request, () => fileAnswer(this.#shell, url, bytes));
      }
    }
    if (url.pathname.startsWith('/__box/')) return text('not found\n', 404);

    return this.#unlessSaving(request, (life) => this.#serve(request, origin, life));
  }

  override async alarm(): Promise<void> {
    const storage = this.ctx.storage;
    let life = await this.#reconcile();
    if (life.phase === 'saving') {
      if (this.#saving) return alarmIn(storage, ALARM_MS);
      life = await recoverSave(this.#shell, storage, life);
    }
    if (!this.#container.running) return;
    void this.#keepRunning();
    await alarmIn(storage, ALARM_MS);
    life = await checkBake(this.#shell, this.ctx.storage, life);
    if (!this.#container.running) return;
    const down = downOf(life);
    if (down) return this.#retrySave(down.tries);
    await withTimeout(connectSlack(this.#slack), 4 * CALL_MS, 'connecting Slack').catch((error: unknown) =>
      console.log(`slack not connected yet: ${messageOf(error)}`)
    );
    const last = Math.max(this.#lastActivity, (await storage.get<number>('lastActivity')) ?? 0);
    if (Date.now() - last < idleMs(this.env)) return;
    await this.#sleep('idle').catch((error: unknown) => console.log(`saving failed: ${messageOf(error)}`));
  }

  async state(): Promise<BoxStatus & { slackEvents: ReadonlyArray<SlackEventNote> }> {
    const life = await this.#reconcile();
    const lastActivity = this.#lastActivity || ((await this.ctx.storage.get<number>('lastActivity')) ?? 0);
    const origin = (await this.ctx.storage.get<string>('origin')) ?? null;
    const lastStart = await this.ctx.storage.get<LastStart>('lastStart');

    return {
      ...status(life, this.#container.running, lastActivity, origin),
      ...(lastStart && { lastStart }),
      ...(await slackState(this.#slack)),
    };
  }

  // A Durable Object is created near its first caller and never moves, and its container runs where it is: a
  // snapshot restores in seconds where it was saved or restored before, and takes minutes elsewhere. So base makes
  // the first call to every new box. A `locationHint` doesn't do it: measured, it spreads new objects over several
  // locations in a region (IAD, EWR, ATL, MIA, ORD), not base's. This leaves base's container and idle time alone.
  async introduce(box: string): Promise<void> {
    await this.env.BOX.get(this.env.BOX.idFromName(box)).ping();
  }

  ping(): void {}

  slackEvent(event: SlackEvent): Promise<SlackAnswer | null> {
    if (this.#saving) return Promise.resolve(null);

    return slackEvent(this.#slack, event);
  }

  async #afterRestart(): Promise<void> {
    const { phase } = await lifeOf(this.ctx.storage);
    const running = this.#container.running;
    if (!running && phase !== 'saving') return;
    if (running) void this.#keepRunning();
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
      this.#container.running ? f() : text('the box is not running: `box up`\n', 409)
    );
  }

  async #reconcile(): Promise<Life> {
    const storage = this.ctx.storage;
    const life = await lifeOf(storage);
    const running = this.#container.running;
    if (!running && (life.phase === 'baking' || life.phase === 'running'))
      return setLife(storage, stopped(life, `the container stopped while ${life.phase}, without a save`));
    if (!running && life.phase === 'saving' && !this.#saving)
      return setLife(storage, stopped(life, 'a restart cut the save off after the container stopped'));
    if (running && life.phase === 'asleep' && !this.#saving) await this.#container.destroy('saved');

    return life;
  }

  async #serve(request: Request, origin: string, life: Life): Promise<Response> {
    if (!this.#container.running) {
      if (life.phase === 'lost')
        return text(
          `This box's snapshot ${life.lost.id} couldn't be restored (snapshots expire 30 days after they were made or last restored). Run \`box up\` to start it again (from base, or a new bake).\n`,
          503
        );
      if (life.phase !== 'asleep') return text('This box is not set up yet: run `box up`.\n', 503);
      await this.#wake(origin, life.snapshot);

      return waking(request);
    }
    // A request to the port waits until the container is up, minutes for a cold restore.
    if (this.#starting) return waking(request);
    // The port speaks plain HTTP. The host stays the public one, which S3 signatures and Clerk check.
    const inside = new URL(request.url);
    inside.protocol = 'http:';
    try {
      return await this.#port().fetch(new Request(inside, request));
    } catch (error) {
      console.log(`box not serving yet: ${messageOf(error)}`);

      return waking(request);
    }
  }

  async #up(url: URL, origin: string): Promise<StateAnswer> {
    await this.ctx.storage.put('origin', origin);
    const life = await checkBake(this.#shell, this.ctx.storage, await this.#reconcile());
    if (this.#container.running) return { state: this.#starting ? 'waking' : life.phase };
    const from = url.searchParams.get('from');
    const snapshot = snapshotOf(life) ?? (from ? { id: from, name: `from ${from}` } : null);
    if (snapshot) {
      await this.#wake(origin, snapshot);

      return { state: 'waking' };
    }
    const ref = url.searchParams.get('ref') ?? 'next';
    const github = readToken(this.env);
    const image = this.#container.images.box;
    if (!image) throw new Error(`${HOST} was deployed without the box image`);
    await this.#start({ image }, ['tini', '--', 'sleep', 'infinity']);
    void this.#keepRunning();
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
    await this.#restore({ since: Date.now(), snapshot, attempts: 1 }, origin);
  }

  // Returns once the container starts. Until the box first answers (`#answered` records `lastStart`), the restore is
  // watched in the background, since a cold one takes minutes: it may fail (the snapshot is lost) or hang (it is
  // started again once).
  //
  // Snapshots expire 30 days after they were made or last restored, and nothing extends them. A restore that fails
  // stops the container before the box ever answers, without an exit code; then the snapshot is forgotten (kept as
  // `lost`) so the next `up` starts it from base (a PR or branch box) or bakes it, instead of retrying a dead id
  // forever. Once a command has run in the box (the watchdog's probe runs one), its snapshot was restored, and a later
  // stop says nothing about it.
  async #restore(starting: Starting, origin: string): Promise<void> {
    const { snapshot } = starting;
    this.#starting = starting;
    try {
      await this.#start({ containerSnapshot: snapshot }, START, origin);
    } catch (error) {
      this.#starting = null;
      throw error;
    }
    // Claimed before the await, so the two detectors below mark it lost once.
    const lost = async (error: unknown) => {
      if (this.#starting !== starting) return;
      this.#starting = null;
      if (snapshotOf(await lifeOf(this.ctx.storage))?.id === snapshot.id)
        await this.#forget(snapshot, messageOf(error));
    };
    const failed = (error: unknown) => console.log(`marking ${snapshot.id} lost failed: ${messageOf(error)}`);
    // A snapshot that doesn't exist stops the container at once, before `monitor` can see it.
    this.ctx.waitUntil(
      this.#keepRunning()
        .catch((error: unknown) => (this.#container.running ? undefined : lost(error)))
        .catch(failed)
    );
    this.ctx.waitUntil(
      this.#container
        .monitor()
        .catch((error: unknown) => {
          const exited = error instanceof Error && 'exitCode' in error && typeof error.exitCode === 'number';

          return exited ? undefined : lost(error);
        })
        .catch(failed)
    );
    this.ctx.waitUntil(this.#restartIfHung(starting, origin));
  }

  // A hung restore never answers (one stayed hung for over 14 minutes, and the same snapshot started again answered in
  // under a second), and nothing else restarts it (the alarm's Slack connect may run a command in it, but gives up
  // after a timeout). Only the first attempt is started again; a second one that hangs is probed until it answers, as
  // every restore waited before: until then the page shows that the box is waking (see `#serve`). This lives in
  // memory: a restart of this object (every deploy) drops it, and that restore waits too.
  async #restartIfHung(starting: Starting, origin: string): Promise<void> {
    const { id } = starting.snapshot;
    const until = starting.attempts > 1 ? Number.POSITIVE_INFINITY : starting.since + RESTORE_MS;
    let quiet = true;
    while (this.#restoring(starting) && Date.now() < until) {
      // A command in a container that is still restoring waits; `run` counts it as the box answering.
      const ran = await exitCode(
        this.#shell,
        ['true'],
        Math.min(CALL_MS, until - Date.now()),
        'the restore probe'
      ).then(
        () => true,
        () => false
      );
      if (ran) return;
      if (quiet && this.#restoring(starting))
        console.log(`restoring ${id}: no answer after ${Math.round((Date.now() - starting.since) / 1000)} s`);
      quiet = false;
      await new Promise((resolve) => setTimeout(resolve, PROBE_EVERY_MS));
    }
    // A delete, discard, adopt, save or lost snapshot may have come while the probe waited.
    const life = await lifeOf(this.ctx.storage);
    if (!this.#restoring(starting) || life.phase !== 'running' || life.snapshot?.id !== id) return;
    console.log(`restoring ${id} didn't answer in ${RESTORE_MS / 1000} s; starting it again`);
    // Replaced before the destroy: requests meanwhile see the box waking, and the first attempt's detectors don't take
    // the stop for a lost snapshot. Not under `blockConcurrencyWhile`: stopping a restoring container took 112 to 204 s.
    const again = { ...starting, attempts: starting.attempts + 1 };
    this.#starting = again;
    const failed = (error: unknown) => {
      console.log(`starting ${id} again failed: ${messageOf(error)}`);
      if (this.#starting === again) this.#starting = null;
    };
    try {
      await this.#container.destroy('the restore hung');
    } catch (error) {
      return failed(error);
    }
    // Brief (the start doesn't wait for the container): a request between the check and the start would see the
    // container stopped and put the box to sleep. A throw in it would reset this object.
    await this.ctx.blockConcurrencyWhile(async () => {
      try {
        // A delete, discard, adopt or new start may have come during the destroy.
        if (this.#starting !== again || this.#container.running) return;
        // A request that saw the container stopped during the destroy put the box to sleep.
        if ((await lifeOf(this.ctx.storage)).phase !== 'running')
          await setLife(this.ctx.storage, {
            phase: 'running',
            since: Date.now(),
            snapshot: starting.snapshot,
            down: null,
            saveFailed: null,
          });
        await this.#restore(again, origin);
      } catch (error) {
        failed(error);
      }
    });
  }

  #restoring(starting: Starting): boolean {
    return this.#starting === starting && this.#container.running;
  }

  async #forget(snapshot: Snapshot, message: string): Promise<void> {
    this.#starting = null;
    console.log(`restoring snapshot ${snapshot.id} failed, so it is forgotten: ${message}`);
    await setLife(this.ctx.storage, { phase: 'lost', since: Date.now(), lost: { id: snapshot.id, ...note(message) } });
  }

  async #start(from: StartFrom, entrypoint: Array<string>, origin?: string): Promise<void> {
    await resetSlack(this.#slack);
    // Before the start: the alarm is what puts the box to sleep.
    await alarmIn(this.ctx.storage, ALARM_MS);
    const env = await this.#boxEnv(origin);
    try {
      this.#container.start({ instance: INSTANCE, enableInternet: true, env, entrypoint, ...from });
    } catch (error) {
      throw new Error(`start: ${messageOf(error)}`);
    }
    this.#touch();
  }

  // In the background: setting the timeout waits until the container is up, minutes for a cold restore. A request held
  // that long fails when Cloudflare replaces this object meanwhile (it does, now and then), and a
  // `blockConcurrencyWhile` over 30 s resets it.
  #keepRunning(): Promise<void> {
    const set = this.#container.setInactivityTimeout(backstopMs(this.env));
    this.ctx.waitUntil(
      set.catch((error: unknown) => console.log(`setting the inactivity timeout failed: ${messageOf(error)}`))
    );

    return set;
  }

  // A command ran in the box (the watchdog's probe, or any other), so its snapshot was restored. Its address doesn't
  // count: `#serve` answers that it's waking until then.
  #answered(): void {
    const starting = this.#starting;
    if (!starting) return;
    this.#starting = null;
    this.ctx.waitUntil(
      this.#recordRestore(starting, Date.now()).catch((error: unknown) =>
        console.log(`recording the restore failed: ${messageOf(error)}`)
      )
    );
  }

  async #recordRestore({ since, snapshot: { id: snapshot }, attempts }: Starting, answered: number): Promise<void> {
    const colo = await this.#ownColo();
    const lastStart: LastStart = {
      at: new Date(since).toISOString(),
      snapshot,
      ms: answered - since,
      attempts,
      ...(colo && { colo }),
    };
    await this.ctx.storage.put('lastStart', lastStart);
    const container = await output(this.#shell, ['curl', '-fsS', '--max-time', '5', TRACE], 'the container colo').then(
      coloOf,
      () => undefined
    );
    console.log(`restored ${snapshot} in ${lastStart.ms} ms in ${colo} (container in ${container})`);
    if (container) await this.ctx.storage.put('lastStart', { ...lastStart, container });
  }

  async #ownColo(): Promise<string | undefined> {
    this.#colo ??= await fetch(TRACE, { signal: AbortSignal.timeout(5_000) })
      .then((response) => response.text())
      .then(coloOf, () => undefined);

    return this.#colo;
  }

  // Saving can outlast the request that asked for it (a big disk takes over 5 minutes), and a cancelled request
  // would stop the box without its snapshot; an alarm runs for up to 15 minutes on its own.
  async #sleepSoon(): Promise<StateAnswer> {
    const storage = this.ctx.storage;
    const life = await this.#reconcile();
    if (!this.#container.running) {
      this.#cancelStart();

      return { state: life.phase };
    }
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

  // Stops the box without saving, so it wakes from the snapshot it woke from: a failed refresh of base leaves base as
  // it was.
  async #discard(): Promise<StateAnswer> {
    const life = await this.#reconcile();
    if (!this.#container.running) {
      this.#cancelStart();

      return { state: life.phase };
    }
    this.#stopUnsaved();
    await this.#container.destroy('discarded');

    return { state: (await setLife(this.ctx.storage, stopped(life, 'stopped without a save (discard)'))).phase };
  }

  // Takes over another box's saved snapshot, dropping whatever this box runs: a rebake bakes in another box, so
  // base is replaced only once the new snapshot exists.
  async #adopt(url: URL, origin: string): Promise<StateAnswer> {
    const id = url.searchParams.get('snapshot');
    if (!id) throw new Error('adopt needs ?snapshot=<id>');
    this.#stopUnsaved();
    if (this.#container.running) await this.#container.destroy('replaced');
    const storage = this.ctx.storage;
    await storage.put('origin', origin);
    await setLife(storage, {
      phase: 'asleep',
      since: Date.now(),
      snapshot: { id, name: `adopted ${id}` },
      error: null,
    });

    return { state: 'asleep', snapshot: id };
  }

  // Asked to stop while the watchdog stops a hung restore: it must not start the box again. Only the start: a save
  // that is finishing (its container already stopped) must still record its snapshot.
  #cancelStart(): void {
    this.#starting = null;
  }

  // A save that runs stores nothing, and a stop doesn't count as a failed restore.
  #stopUnsaved(): void {
    this.#generation++;
    this.#starting = null;
  }

  async #destroy(): Promise<StateAnswer> {
    this.#stopUnsaved();
    await unregisterSlack(this.#slack);
    if (this.#container.running) await this.#container.destroy('deleted');
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();

    return { state: 'deleted' };
  }

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
