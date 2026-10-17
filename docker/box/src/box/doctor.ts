// What the box reports (`state`, `doctor`), and what stops and restarts it around a snapshot (`quiesce`, `resume`)
// or stops an apply (`stop-apply`).

import { log } from '../node/main.ts';
import { poll } from '../node/poll.ts';
import { output } from '../node/process.ts';
import { Applied, Applying, Baked, type BoxState, type DoctorReport } from '../shared/contracts.ts';
import { runnable } from './apply.ts';
import { isAlive, lockHolder } from './lock.ts';
import { API_HEALTH, APPLIED, APPLYING, BAKED } from './paths.ts';
import { APPS, PROCESSES, STORES } from './processes.ts';
import { httpStatus, readJson, waitForHttp } from './runtime.ts';
import { list, pc, running, stopRunning, storesReady } from './supervisor.ts';

// The baked and applied commits, an apply that didn't finish, and the bake or apply that runs now. It reads files
// only, so it answers before the supervisor is up and after `quiesce`.
export function state(): BoxState {
  return {
    baked: readJson(BAKED, Baked),
    applied: readJson(APPLIED, Applied),
    applying: readJson(APPLYING, Applying),
    lock: lockHolder(),
  };
}

// Whether the box is fit to test on: no bake or apply running or an apply left half done, every process up (and
// ready, if it has a probe), and the API, dashboard and bridge app answering. `problems` says what isn't.
export async function doctor(): Promise<DoctorReport> {
  const problems: Array<string> = [];
  const { baked, applied, applying, lock } = state();
  if (lock) problems.push(`a ${lock.command} is running (pid ${lock.pid})`);
  if (applying && !lock)
    problems.push(`the apply of ${applying.sha.slice(0, 10)} didn't finish; apply again to finish it`);

  const rows = await list();
  problems.push(...processTableProblems(rows.map((row) => row.name)));
  const processes = rows
    .filter((row) => row.status !== 'Disabled')
    .map(({ name, status, is_ready: ready, exit_code: exitCode, restarts }) => ({
      name,
      status,
      ready,
      exitCode,
      restarts,
    }));
  problems.push(...processes.flatMap((entry) => processProblem(entry) ?? []));

  const http: Record<string, number> = {};
  const urls = { api: API_HEALTH, dashboard: 'http://127.0.0.1:4200/', bridge: 'http://127.0.0.1:4000/api/novu' };
  for (const [name, url] of Object.entries(urls)) {
    http[name] = await httpStatus(url);
    if (http[name] !== 200) problems.push(`${name} answered ${http[name] || 'nothing'} at ${url}`);
  }

  return { ok: !problems.length, problems, baked, applied, lock, http, processes };
}

// Only migrate runs once; any other process that completed was stopped or exited, whatever its exit code.
function processProblem({ name, status, ready, exitCode }: DoctorReport['processes'][number]): string | undefined {
  if (status === 'Completed' && name !== 'migrate') return `${name} stopped (exit ${exitCode})`;
  if (status === 'Completed' ? exitCode !== 0 : status !== 'Running' || ready === 'Not Ready')
    return `${name} is ${status === 'Running' ? 'not ready' : status}`;
  return undefined;
}

function processTableProblems(names: ReadonlyArray<string>): Array<string> {
  const unknown = names.filter((name) => !PROCESSES[name]);
  const missing = Object.keys(PROCESSES).filter((name) => !names.includes(name));

  return [
    ...(unknown.length ? [`processes.ts's PROCESSES lacks ${unknown.join(', ')} from process-compose.yaml`] : []),
    ...(missing.length ? [`process-compose.yaml lacks ${missing.join(', ')} from processes.ts's PROCESSES`] : []),
  ];
}

// Stops the apply that runs and everything it started, within a minute; CI calls it when a newer push supersedes
// the one being applied. The apply was started detached (src/shared/names.ts), so its pid is its process group; its
// SIGTERM handler stops each child's own group (src/node/process.ts). The next apply takes over its lock and redoes
// its files (.applying.json).
export async function stopApply(): Promise<void> {
  const holder = lockHolder();
  if (holder?.command !== 'apply') return;
  const kill = (pid: number, name: NodeJS.Signals) => {
    try {
      return process.kill(pid, name);
    } catch {
      return false;
    }
  };
  // An apply started without `setsid` (by hand) has no process group of its own: then only its pid. Never both: a
  // second SIGTERM would kill the apply before it stopped its children.
  const signal = (name: NodeJS.Signals) => kill(-holder.pid, name) || kill(holder.pid, name);
  const gone = async () => !isAlive(-holder.pid) && !isAlive(holder.pid);
  signal('SIGTERM');
  if (!(await poll<boolean>(gone, { timeoutMs: 60_000, orElse: () => false }))) {
    // It ignored its SIGTERM. Its children lead their own groups, so each is found (before its death hands them to
    // PID 1) and killed.
    for (const pid of await descendants(holder.pid)) kill(pid, 'SIGKILL');
    signal('SIGKILL');
  }
  await poll(gone, { timeoutMs: 10_000, what: `the apply ${holder.pid} outlived SIGKILL` });
  log(`stopped the apply of an older push (pid ${holder.pid})`);
}

async function descendants(root: number): Promise<Array<number>> {
  const children = new Map<number, Array<number>>();
  for (const line of (await output('ps', ['-eo', 'pid=,ppid='])).split('\n')) {
    const [pid = 0, parent = 0] = line.trim().split(/\s+/).map(Number);
    if (pid) children.set(parent, [...(children.get(parent) ?? []), pid]);
  }
  const found: Array<number> = [];
  for (let next = [root]; next.length; next = next.flatMap((pid) => children.get(pid) ?? [])) found.push(...next);

  return found.filter((pid) => pid !== root);
}

// Stops every process, the stores last, leaving the supervisor up for a snapshot.
export async function quiesce(): Promise<void> {
  await stopRunning(APPS);
  await stopRunning(STORES);
}

// Starts again what `quiesce` stopped, when the box keeps running after all (saving it failed): the stores, then,
// once they are ready, the rest. `migrate` already ran on this data.
export async function resume(): Promise<void> {
  const notRunning = async (names: ReadonlyArray<string>) => {
    const now = await running();

    return names.filter((name) => !now.has(name));
  };
  for (const name of await notRunning(STORES)) await pc(['process', 'start', name]);
  await poll(storesReady, { timeoutMs: 120_000, what: 'the stores are not ready' });
  const apps = runnable(APPS).filter((name) => name !== 'migrate');
  for (const name of await notRunning(apps)) await pc(['process', 'start', name]);
  await waitForHttp(API_HEALTH, 300);
  log('resumed');
}
