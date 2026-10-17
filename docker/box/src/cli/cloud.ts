// `--cloud`: the box runs on Cloudflare in the host Worker (src/cloud/host.ts, shared by all boxes) and is reached
// through its own small Worker `novu-box-<box>` on workers.dev (src/cloud/thin.ts). The same commands as for a local
// box, over HTTPS, signed in with your GitHub token (`gh auth token`), or CI's OIDC token (src/ci).

import fs from 'node:fs';
import * as z from 'zod';
import { log } from '../node/main.ts';
import { poll } from '../node/poll.ts';
import { BoxStatus, DoctorReport, decode, fromJson, needsBake, StateAnswer } from '../shared/contracts.ts';
import { BOX_CLI, boxWorker, DOMAIN, HOST } from '../shared/names.ts';
import {
  boxFetch,
  type FetchInit,
  failUnlessOk,
  fetchThrough,
  hostBoxes,
  hostExists,
  readExec,
  type Token,
} from './cloud-http.ts';
import type { BoxCall, Target, UpOptions } from './target.ts';

// A first bake takes 11 to 14 minutes on Cloudflare; a wake about 35 s, but the first restore of a snapshot 4 to 6
// minutes (the Slack router waits as long).
const READY_WITHIN_SECONDS = { baking: 25 * 60, waking: 8 * 60, running: 5 * 60 };

interface Exec {
  readonly cmd: ReadonlyArray<string>;
  readonly cwd?: string;
  readonly github?: boolean;
}

// Why the box won't get ready, when its phase says so: its snapshot is lost, or it stopped (its bake failed).
function stuck(worker: string, current: BoxStatus | null): string | null {
  if (current?.phase === 'lost')
    return `${worker} couldn't restore snapshot ${current.lost.id} (${current.lost.message}); snapshots expire 30 days after they were made or last restored. Run \`up\` again to bake it`;
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
  // No wait runs past it (CI's job time), in ms since the epoch.
  readonly deadline?: number;
}

export interface CloudTarget extends Target {
  // null only when the box's Worker doesn't exist; a failed request fails.
  readonly state: () => Promise<BoxStatus | null>;
  // `reachable`: any doctor answer will do, even a running box's, for an apply, which fixes or replaces what the
  // doctor finds.
  readonly readyFor: (options: { readonly reachable: boolean }) => Promise<void>;
  // The doctor's report once the box is fit, or its last one after `seconds`: what an apply left behind.
  readonly settled: (seconds: number) => Promise<DoctorReport | null>;
  // Any command in the box, its output collected; fails unless it exits 0.
  readonly runOutput: (cmd: ReadonlyArray<string>, options?: BoxCall) => Promise<string>;
}

export function cloudTarget(options: CloudOptions): CloudTarget {
  const { box, token, deadline = Number.POSITIVE_INFINITY } = options;
  const worker = boxWorker(box);
  const origin = `https://${worker}.${DOMAIN}`;

  // The box's answer, or its failure; 409 (the box isn't running) is the caller's to read.
  const call = async (path: string, init: FetchInit = {}) => {
    const response = await boxFetch(`${origin}/__box${path}`, init, token);
    await failUnlessOk(response, `${worker} ${path}`, 409);

    return response;
  };

  // null only when the box's Worker doesn't exist (Cloudflare's 404 page).
  const state = async () => {
    const response = await fetchThrough(`${origin}/__box/state`, {}, token, true);
    if (!response) return null;
    await failUnlessOk(response, `${worker} /state`);

    return decode(BoxStatus, await response.text(), `${worker} /state`);
  };

  const snapshotOf = async (name: string) => {
    const response = await fetchThrough(`https://${boxWorker(name)}.${DOMAIN}/__box/state`, {}, token, true);
    if (!response?.headers.get('content-type')?.includes('json')) return null;

    return decode(BoxStatus, await response.text(), `${boxWorker(name)} /state`).snapshot?.id ?? null;
  };

  // Streams a command's output to stdout (or collects it) and returns its exit code (or its output).
  const stream = async (body: Exec, capture: boolean) => {
    const response = await call('/exec', { method: 'POST', body: JSON.stringify(body) });
    if (response.status === 409) throw new Error(`${worker} isn't running: \`box up --cloud --box ${box}\``);

    return readExec(response, capture).catch((error: Error) => {
      throw new Error(`${worker} /exec: ${error.message}`);
    });
  };
  const streamed = async (body: Exec) => (await stream(body, false)).exitCode;
  const collected = async (body: Exec) => {
    const { exitCode, output } = await stream(body, true);
    if (exitCode !== 0) throw new Error(`${body.cmd.join(' ')} exited with ${exitCode}: ${output.slice(-500)}`);

    return output.trim();
  };

  // The snapshot a new box starts from: `from`'s, or base's for a branch box that is new; none means bake.
  const startingSnapshot = async (from: string | undefined, fromBase: boolean, ref: string) => {
    if (from) {
      const id = await snapshotOf(from);
      if (!id) throw new Error(`${boxWorker(from)} has no snapshot to start from`);

      return id;
    }
    const current = await state();
    if (!fromBase || box === 'base' || (current && !needsBake(current))) return null;
    const id = await snapshotOf('base');
    log(
      id ? `${worker} is new: starting it from ${boxWorker('base')}` : `no ${boxWorker('base')} snapshot: baking ${ref}`
    );

    return id;
  };

  // The box's doctor report, or null while it can't give one (baking, starting).
  const doctor = async () => {
    const text = await collected({ cmd: ['sh', '-c', `${BOX_CLI.join(' ')} doctor || true`] }).catch(() => '');

    return fromJson(DoctorReport).safeParse(text).data ?? null;
  };

  // Asks the doctor every 10 s until `accept` takes its report, and returns that; fails when the box won't get there
  // (`stuck`), and after `seconds` or at the deadline. `orLast`: return the last report then instead (null if none).
  const waitFor = (seconds: number, accept: (report: DoctorReport) => boolean, orLast = false) => {
    const until = Math.min(Date.now() + seconds * 1000, deadline);
    const when = until === deadline ? "the job's time is up" : `after ${seconds}s`;
    let report: DoctorReport | null = null;

    return poll<DoctorReport | null>(
      async () => {
        const why = stuck(worker, await state().catch(() => null));
        if (why) throw new Error(why);
        report = (await doctor()) ?? report;

        return report && accept(report) ? report : null;
      },
      {
        timeoutMs: until - Date.now(),
        everyMs: 10_000,
        orElse: () => {
          if (orLast) return report;
          throw new Error(`${worker} isn't ready (${when}): ${report?.problems.join('; ') ?? 'no doctor report'}`);
        },
      }
    );
  };

  // 0 once the box stopped with a snapshot other than `previous`, 1 when it stopped without one.
  const waitUntilAsleep = (previous: string | undefined) =>
    poll(
      async () => {
        // A request that fails doesn't mean the box stopped; ask again.
        const current = await state().catch(() => null);
        if (current?.phase === 'running' && !current.down && current.saveFailed)
          throw new Error(`${worker} couldn't save, so it keeps running: ${current.saveFailed.message}`);
        if (!current || current.running || current.phase === 'saving') return null;
        console.log(JSON.stringify({ state: current.phase, snapshot: current.snapshot?.id }));
        if (current.snapshot?.id && current.snapshot.id !== previous) return { code: 0 };
        log(`${worker} stopped WITHOUT a new snapshot: its next start bakes, or wakes from an older snapshot`);

        return { code: 1 };
      },
      {
        timeoutMs: 15 * 60_000,
        everyMs: 10_000,
        orElse: () => {
          throw new Error(`${worker} is still saving after 15 minutes`);
        },
      }
    ).then(({ code }) => code);

  // Wakes the box if it sleeps, and waits for its doctor to pass; a running box passes at once. `reachable` still
  // waits for a bake to finish (an earlier push's), since an apply can't run beside it.
  const readyFor = async ({ reachable }: { readonly reachable: boolean }) => {
    const current = await state();
    if (!current || needsBake(current))
      throw new Error(
        `${worker} ${current ? `isn't set up (${current.phase})` : "doesn't exist"}: \`box up --cloud --box ${box}\``
      );
    if (current.phase === 'running' && current.running && !reachable) return;
    if (!current.running || current.phase === 'saving') {
      log(`${worker} is ${current.phase}; waking it`);
      await call('/up', { method: 'POST' });
    }
    const baked = (report: DoctorReport) => Boolean(report.baked) && report.lock?.command !== 'bake';
    await waitFor(READY_WITHIN_SECONDS[readyWait(current)], reachable ? baked : (report) => report.ok);
  };

  const up = async ({ ref = 'next', from, fromBase = false }: UpOptions) => {
    const query = new URLSearchParams({ ref });
    const snapshot = await startingSnapshot(from, fromBase, ref);
    if (snapshot) query.set('from', snapshot);
    if (!(await hostExists())) throw new Error(`${HOST} isn't deployed; deploy it with \`box up --cloud --deploy\``);
    // Uploading the box's Worker is idempotent and takes about 2 s.
    log(`deploying ${worker}`);
    await hostBoxes(`boxes/${box}`, z.unknown(), { method: 'PUT', token });
    const answer = await call(`/up?${query}`, { method: 'POST' });
    const { state: started } = decode(StateAnswer, await answer.text(), `${worker} /up`);
    log(`${worker}: ${started}${started === 'baking' ? ` ${ref} (11 to 14 minutes)` : ''}`);
    const waits: Record<string, number> = READY_WITHIN_SECONDS;
    await waitFor(waits[started] ?? READY_WITHIN_SECONDS.running, (report) => report.ok);
    log(`${worker} is ready`);
    console.log(`box: ${origin}`);
    console.log(`mailpit: ${origin}/mail`);

    return 0;
  };

  // Done when the box stopped with a snapshot newer than the one it had.
  const down = async () => {
    const before = await state();
    if (!before) throw new Error(`${worker} doesn't exist`);
    if (!before.running) {
      log(`${worker} is already ${before.phase} (snapshot ${before.snapshot?.id ?? 'none'})`);

      return before.snapshot?.id ? 0 : 1;
    }
    log(
      `${worker}: saving to its snapshot and stopping (3 to 6 minutes, after a bake or apply that runs); the next request wakes it`
    );
    await call('/down', { method: 'POST' });

    return waitUntilAsleep(before.snapshot?.id);
  };

  return {
    name: worker,
    mailUrl: `${origin}/mail`,
    up,
    down,
    // The host stops the box and forgets it (snapshot and settings), then deletes its Worker; when the box can't be
    // stopped, its Worker stays, so the box isn't left running unreachable. Other boxes are untouched.
    async delete() {
      log(`${worker}: stopping and forgetting the box, then deleting its Worker`);
      await hostBoxes(`boxes/${box}`, z.unknown(), { method: 'DELETE', token });

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
