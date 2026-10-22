import fs from 'node:fs';
import * as z from 'zod';
import { log } from '../node/main.ts';
import { poll } from '../node/poll.ts';
import {
  BoxStatus,
  DeletedBox,
  DoctorReport,
  decode,
  fromJson,
  type LastStart,
  needsBake,
  RegisteredBox,
  StateAnswer,
} from '../shared/contracts.ts';
import { apiOrigin, BOX_CLI, boxOrigin, HOST, isBoxName } from '../shared/names.ts';
import { boxFetch, type FetchInit, failUnlessOk, hostBoxes, hostExists, readExec, type Token } from './cloud-http.ts';

// A first bake takes 13 to 16 minutes on Cloudflare, a wake about 35 s. A snapshot restores in seconds in base's
// location (see `Box.introduce`), up to 6 minutes elsewhere (the Slack router waits as long).
const READY_WITHIN_SECONDS = { baking: 25 * 60, waking: 8 * 60, running: 5 * 60 };

interface Exec {
  readonly cmd: ReadonlyArray<string>;
  readonly cwd?: string;
  readonly github?: boolean;
}

function stuck(box: string, current: BoxStatus | null): string | null {
  if (current?.phase === 'lost')
    return `${box} couldn't restore snapshot ${current.lost.id} (${current.lost.message}); snapshots expire 30 days after they were made or last restored. Run \`up\` again to bake it`;
  if (current?.phase === 'new') return `${box} stopped: ${current.error?.message ?? 'never started'}`;

  return null;
}

function restoreLine(box: string, { ms, colo, container, attempts = 1 }: LastStart): string {
  const where = `${colo ? ` in ${colo}` : ''}${container ? ` (container in ${container})` : ''}`;
  const again = attempts > 1 ? `, started again after the first attempt hung` : '';

  return `${box}: restored in ${(ms / 1000).toFixed(1)} s${where}${again}`;
}

function readyWait(current: BoxStatus): keyof typeof READY_WITHIN_SECONDS {
  if (current.phase === 'baking') return 'baking';

  return current.running ? 'running' : 'waking';
}

export interface CloudOptions {
  readonly box: string;
  readonly token: Token;
  readonly deadline?: number;
}

export interface UpOptions {
  readonly from?: string | undefined;
  readonly fromBase?: boolean;
  readonly ref?: string;
  // Done once the box answers (an apply follows), not once it's healthy.
  readonly reachable?: boolean;
}

export interface BoxCall {
  readonly github?: boolean;
}

export interface CloudTarget {
  readonly name: string;
  readonly mailUrl: string;
  readonly up: (options: UpOptions) => Promise<number>;
  readonly down: () => Promise<number>;
  readonly discard: () => Promise<void>;
  readonly adopt: (snapshot: string) => Promise<void>;
  readonly delete: () => Promise<number>;
  readonly ready: () => Promise<void>;
  readonly box: (args: ReadonlyArray<string>, options?: BoxCall) => Promise<number>;
  readonly boxOutput: (args: ReadonlyArray<string>, options?: BoxCall) => Promise<string>;
  readonly exec: (cmd: ReadonlyArray<string>) => Promise<number>;
  readonly put: (file: string, path: string) => Promise<void>;
  readonly state: () => Promise<BoxStatus | null>;
  readonly readyFor: (options: { readonly reachable: boolean }) => Promise<void>;
  readonly settled: (seconds: number) => Promise<DoctorReport | null>;
  readonly runOutput: (cmd: ReadonlyArray<string>, options?: BoxCall) => Promise<string>;
}

export function cloudTarget(options: CloudOptions): CloudTarget {
  const { box, token, deadline = Number.POSITIVE_INFINITY } = options;
  if (!isBoxName(box)) throw new Error(`\`${box}\` is not a box name`);
  const origin = boxOrigin(box);

  const call = async (path: string, init: FetchInit = {}) => {
    const response = await boxFetch(`${origin}/__box${path}`, init, token);
    await failUnlessOk(response, `${box} ${path}`, 409);

    return response;
  };

  const state = async () => {
    const response = await boxFetch(`${origin}/__box/state`, {}, token);
    if (response.status === 404) {
      await response.body?.cancel();

      return null;
    }
    await failUnlessOk(response, `${box} /state`);

    return decode(BoxStatus, await response.text(), `${box} /state`);
  };

  const snapshotOf = async (name: string) => {
    const response = await boxFetch(`${boxOrigin(name)}/__box/state`, {}, token);
    if (!response.headers.get('content-type')?.includes('json')) return null;

    return decode(BoxStatus, await response.text(), `${name} /state`).snapshot?.id ?? null;
  };

  const stream = async (body: Exec, capture: boolean) => {
    const response = await call('/exec', { method: 'POST', body: JSON.stringify(body) });
    if (response.status === 409) throw new Error(`${box} isn't running: \`box up --box ${box}\``);

    return readExec(response, capture).catch((error: Error) => {
      throw new Error(`${box} /exec: ${error.message}`);
    });
  };
  const streamed = async (body: Exec) => (await stream(body, false)).exitCode;
  const collected = async (body: Exec) => {
    const { exitCode, output } = await stream(body, true);
    if (exitCode !== 0) throw new Error(`${body.cmd.join(' ')} exited with ${exitCode}: ${output.slice(-500)}`);

    return output.trim();
  };

  const startingSnapshot = async (
    current: BoxStatus | null,
    from: string | undefined,
    fromBase: boolean,
    ref: string
  ) => {
    if (from) {
      const id = await snapshotOf(from);
      if (!id) throw new Error(`${from} has no snapshot to start from`);

      return id;
    }
    if (!fromBase || box === 'base' || (current && !needsBake(current))) return null;
    const id = await snapshotOf('base');
    log(id ? `${box} is new: starting it from base` : `no base snapshot: baking ${ref}`);

    return id;
  };

  const answers = (report: DoctorReport) => Boolean(report.baked) && report.lock?.command !== 'bake';

  const doctor = async () => {
    const text = await collected({ cmd: ['sh', '-c', `${BOX_CLI.join(' ')} doctor || true`] }).catch(() => '');

    return fromJson(DoctorReport).safeParse(text).data ?? null;
  };

  const waitFor = (seconds: number, accept: (report: DoctorReport) => boolean, orLast = false) => {
    const until = Math.min(Date.now() + seconds * 1000, deadline);
    const when = until === deadline ? "the job's time is up" : `after ${seconds}s`;
    let report: DoctorReport | null = null;

    return poll<DoctorReport | null>(
      async () => {
        const why = stuck(box, await state().catch(() => null));
        if (why) throw new Error(why);
        report = (await doctor()) ?? report;

        return report && accept(report) ? report : null;
      },
      {
        timeoutMs: until - Date.now(),
        // Every doctor run costs the box a Node start; a bake takes minutes anyway.
        everyMs: seconds >= READY_WITHIN_SECONDS.baking ? 10_000 : 2000,
        orElse: () => {
          if (orLast) return report;
          throw new Error(`${box} isn't ready (${when}): ${report?.problems.join('; ') ?? 'no doctor report'}`);
        },
      }
    );
  };

  const waitUntilAsleep = (previous: string | undefined) =>
    poll(
      async () => {
        const current = await state().catch(() => null);
        if (current?.phase === 'running' && !current.down && current.saveFailed)
          throw new Error(`${box} couldn't save, so it keeps running: ${current.saveFailed.message}`);
        if (!current || current.running || current.phase === 'saving') return null;
        console.log(JSON.stringify({ state: current.phase, snapshot: current.snapshot?.id }));
        if (current.snapshot?.id && current.snapshot.id !== previous) return { code: 0 };
        log(`${box} stopped WITHOUT a new snapshot: its next start bakes, or wakes from an older snapshot`);

        return { code: 1 };
      },
      {
        timeoutMs: 15 * 60_000,
        everyMs: 10_000,
        orElse: () => {
          throw new Error(`${box} is still saving after 15 minutes`);
        },
      }
    ).then(({ code }) => code);

  // The box records a restore a moment after it first answers; a start from the image records none.
  const logRestore = async (before: BoxStatus | null) => {
    if (before?.running) return;
    const restored = await poll<LastStart | null>(
      async () => {
        const lastStart = (await state().catch(() => null))?.lastStart;

        return lastStart?.at !== before?.lastStart?.at && lastStart;
      },
      { timeoutMs: 5000, everyMs: 1000, orElse: () => null }
    );
    if (restored) log(restoreLine(box, restored));
  };

  const readyFor = async ({ reachable }: { readonly reachable: boolean }) => {
    const current = await state();
    if (!current || needsBake(current))
      throw new Error(
        `${box} ${current ? `isn't set up (${current.phase})` : "doesn't exist"}: \`box up --box ${box}\``
      );
    if (current.phase === 'running' && current.running && !reachable) return;
    if (!current.running || current.phase === 'saving') {
      log(`${box} is ${current.phase}; waking it`);
      await call('/up', { method: 'POST' });
    }
    await waitFor(READY_WITHIN_SECONDS[readyWait(current)], reachable ? answers : (report) => report.ok);
  };

  const up = async (options: UpOptions): Promise<number> => {
    const { ref = 'next', from, fromBase = false, reachable = false } = options;
    const query = new URLSearchParams({ ref });
    const current = await state();
    const snapshot = await startingSnapshot(current, from, fromBase, ref);
    if (snapshot) query.set('from', snapshot);
    if (!(await hostExists())) throw new Error(`${HOST} isn't deployed; deploy it with \`box deploy\``);
    const { warning } = await hostBoxes(`boxes/${box}`, RegisteredBox, { method: 'PUT', token });
    if (warning) log(`WARN: ${box} wasn't created by base (${warning}); it may restore slowly`);
    const waits: Record<string, number> = READY_WITHIN_SECONDS;
    try {
      const started = await call(`/up?${query}`, { method: 'POST' }).then(
        async (answer) => decode(StateAnswer, await answer.text(), `${box} /up`).state,
        (error: Error) => {
          // A snapshot restore can outlast the request (Node gives up after 5 minutes); the box goes on.
          if (!error.message.endsWith('fetch failed')) throw error;
          log(`${box} /up didn't answer: ${error.message}; waiting for the restore`);

          return 'waking';
        }
      );
      log(`${box}: ${started}${started === 'baking' ? ` ${ref} (13 to 16 minutes)` : ''}`);
      await waitFor(waits[started] ?? READY_WITHIN_SECONDS.running, reachable ? answers : (report) => report.ok);
    } catch (error) {
      // Its own snapshot is gone: now `lost`, it starts from base's.
      if (!fromBase || snapshot || (await state())?.phase !== 'lost') throw error;
      log(`${box} couldn't restore its snapshot; starting it from base instead`);

      return up(options);
    }
    log(`${box} is ${reachable ? 'up' : 'ready'}`);
    await logRestore(current);
    console.log(`box: ${origin}`);
    console.log(`api: ${apiOrigin(box)}`);
    console.log(`mailpit: ${origin}/mail`);

    return 0;
  };

  const down = async () => {
    const before = await state();
    if (!before) throw new Error(`${box} doesn't exist`);
    if (!before.running) {
      log(`${box} is already ${before.phase} (snapshot ${before.snapshot?.id ?? 'none'})`);

      return before.snapshot?.id ? 0 : 1;
    }
    log(
      `${box}: saving to its snapshot and stopping (3 to 6 minutes, after a bake or apply that runs); the next request wakes it`
    );
    await call('/down', { method: 'POST' });

    return waitUntilAsleep(before.snapshot?.id);
  };

  return {
    name: box,
    mailUrl: `${origin}/mail`,
    up,
    down,
    async discard() {
      log(`${box}: stopping it without a save`);
      await call('/discard', { method: 'POST' });
    },
    async adopt(snapshot) {
      if (!(await state())) await hostBoxes(`boxes/${box}`, z.unknown(), { method: 'PUT', token });
      log(`${box}: taking over snapshot ${snapshot}`);
      await call(`/adopt?snapshot=${encodeURIComponent(snapshot)}`, { method: 'POST' });
    },
    async delete() {
      log(`${box}: stopping and forgetting the box, then deleting its test users`);
      const { users, usersError } = await hostBoxes(`boxes/${box}`, DeletedBox, { method: 'DELETE', token });
      if (users.length) log(`deleted ${box}'s test users: ${users.join(', ')}`);
      if (usersError) log(`WARN: ${box}'s test users weren't deleted: ${usersError}`);

      return 0;
    },
    ready: () => readyFor({ reachable: false }),
    readyFor,
    settled: (seconds) => waitFor(seconds, (report) => report.ok, true),
    state,
    box: (args, { github = false } = {}) => streamed({ cmd: [...BOX_CLI, ...args], github }),
    boxOutput: (args, { github = false } = {}) => collected({ cmd: [...BOX_CLI, ...args], github }),
    runOutput: (cmd, { github = false } = {}) => collected({ cmd, github }),
    exec: (cmd) => streamed({ cmd, cwd: '/data/novu' }),
    put: async (file, path) => {
      await call(`/file?path=${encodeURIComponent(path)}`, { method: 'PUT', body: fs.readFileSync(file) });
    },
  };
}
