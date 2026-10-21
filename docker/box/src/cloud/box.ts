import { DurableObject } from 'cloudflare:workers';
import type { BoxStatus, CreatedBy, LastStart, StateAnswer } from '../shared/contracts.ts';
import { messageOf } from '../shared/errors.ts';
import { boxOfHost, boxOrigin, HOST } from '../shared/names.ts';
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

const TRACE = 'https://www.cloudflare.com/cdn-cgi/trace';

type StartFrom = { readonly image: string } | { readonly containerSnapshot: Snapshot };

interface Starting {
  readonly at: number;
  readonly from: LastStart['from'];
  readonly snapshot?: string;
}

function coloOf(trace: string): string {
  return /^colo=(\w+)$/m.exec(trace)?.[1] ?? 'unknown';
}

export class Box extends DurableObject<HostEnv> {
  #generation = 0;
  #saving = false;
  #restoring: string | null = null;
  #starting: Starting | null = null;
  #colo: string | null = null;
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
    // Any host under the domain reaches a box, unauthenticated, so an unknown one must not be written to.
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
        return this.#unlessSaving(request, async () => json(await this.#up(request, url, origin)));
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
    await this.#container.setInactivityTimeout(backstopMs(this.env));
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
  // the first call to every new box. This leaves base's container and idle time alone.
  async introduce(box: string): Promise<CreatedBy> {
    const created = await this.env.BOX.get(this.env.BOX.idFromName(box)).colo();
    const createdBy = { base: await this.colo(), box: created };
    console.log(`base created ${box}: base in ${createdBy.base}, ${box} in ${createdBy.box}`);

    return createdBy;
  }

  async colo(): Promise<string> {
    this.#colo ??= coloOf(await (await fetch(TRACE)).text());

    return this.#colo;
  }

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
    // The port speaks plain HTTP. The host stays the public one, which S3 signatures and Clerk check.
    const inside = new URL(request.url);
    inside.protocol = 'http:';
    try {
      const response = await this.#port().fetch(new Request(inside, request));
      this.#answered();

      return response;
    } catch (error) {
      console.log(`box not serving yet: ${messageOf(error)}`);

      return waking(request);
    }
  }

  async #up(request: Request, url: URL, origin: string): Promise<StateAnswer> {
    await this.ctx.storage.put('origin', origin);
    const life = await checkBake(this.#shell, this.ctx.storage, await this.#reconcile());
    if (this.#container.running) return { state: life.phase };
    const from = url.searchParams.get('from');
    const snapshot = snapshotOf(life) ?? (from ? { id: from, name: `from ${from}` } : null);
    if (snapshot) {
      await this.#wake(origin, snapshot);

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
    await this.#start({ containerSnapshot: snapshot }, START, origin).catch(async (error: unknown) => {
      // A snapshot that doesn't exist stops the container at once, before `#watchRestore` can see it.
      if (this.#container.running || messageOf(error).startsWith('start:')) throw error;
      await this.#forget(snapshot, messageOf(error));
      throw error;
    });
    this.#watchRestore(snapshot);
  }

  // Snapshots expire 30 days after they were made or last restored, and nothing extends them. A restore that fails
  // stops the container before the box ever answers, without an exit code; then the snapshot is forgotten (kept as
  // `lost`) so the next `up` starts it from base (a PR or branch box) or bakes it, instead of retrying a dead id
  // forever. Once the box has answered (its address or a command), its snapshot was restored, and a later stop says
  // nothing about it.
  #watchRestore(snapshot: Snapshot): void {
    this.#restoring = snapshot.id;
    this.#container.monitor().catch(async (error: unknown) => {
      const exited = error instanceof Error && 'exitCode' in error && typeof error.exitCode === 'number';
      if (this.#restoring !== snapshot.id || !(error instanceof Error) || exited) return;
      if (snapshotOf(await lifeOf(this.ctx.storage))?.id !== snapshot.id) return;
      await this.#forget(snapshot, error.message);
    });
  }

  async #forget(snapshot: Snapshot, message: string): Promise<void> {
    console.log(`restoring snapshot ${snapshot.id} failed, so it is forgotten: ${message}`);
    await setLife(this.ctx.storage, { phase: 'lost', since: Date.now(), lost: { id: snapshot.id, ...note(message) } });
  }

  async #start(from: StartFrom, entrypoint: Array<string>, origin?: string): Promise<void> {
    await resetSlack(this.#slack);
    // Before the start: a first restore can outlast the caller (4 to 6 minutes), and the alarm is what puts the box
    // to sleep.
    await alarmIn(this.ctx.storage, ALARM_MS);
    const env = await this.#boxEnv(origin);
    this.#starting =
      'image' in from
        ? { at: Date.now(), from: 'image' }
        : { at: Date.now(), from: 'snapshot', snapshot: from.containerSnapshot.id };
    try {
      this.#container.start({ instance: INSTANCE, enableInternet: true, env, entrypoint, ...from });
    } catch (error) {
      this.#starting = null;
      throw new Error(`start: ${messageOf(error)}`);
    }
    await this.#container.setInactivityTimeout(backstopMs(this.env));
    this.#touch();
  }

  // The box answered its address or a command, so its start (a snapshot's restore) is over.
  #answered(): void {
    this.#restoring = null;
    const starting = this.#starting;
    if (!starting) return;
    this.#starting = null;
    this.#recordStart(starting, Date.now() - starting.at).catch((error: unknown) =>
      console.log(`recording the start failed: ${messageOf(error)}`)
    );
  }

  async #recordStart(starting: Starting, ms: number): Promise<void> {
    const container = await output(this.#shell, ['curl', '-fsS', '--max-time', '10', TRACE], 'the container colo')
      .then(coloOf)
      .catch(() => 'unknown');
    const lastStart: LastStart = {
      ...starting,
      at: new Date(starting.at).toISOString(),
      ms,
      colo: await this.colo(),
      container,
    };
    console.log(`started from ${starting.from} in ${ms} ms in ${lastStart.colo} (container in ${container})`);
    await this.ctx.storage.put('lastStart', lastStart);
  }

  // Saving can outlast the request that asked for it (a big disk takes over 5 minutes), and a cancelled request
  // would stop the box without its snapshot; an alarm runs for up to 15 minutes on its own.
  async #sleepSoon(): Promise<StateAnswer> {
    const storage = this.ctx.storage;
    const life = await this.#reconcile();
    if (!this.#container.running) return { state: life.phase };
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
    if (!this.#container.running) return { state: life.phase };
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

  // A save that runs stores nothing, and a stop doesn't count as a failed restore.
  #stopUnsaved(): void {
    this.#generation++;
    this.#restoring = null;
  }

  async #destroy(): Promise<StateAnswer> {
    this.#generation++;
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
