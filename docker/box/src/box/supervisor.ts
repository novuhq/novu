// process-compose, the box's supervisor: asking it for its processes, starting and stopping them.

import { poll } from '../node/poll.ts';
import { fromJson, type PcProcess, PcProcesses } from '../shared/contracts.ts';
import { PC_SOCKET, RUN } from './paths.ts';
import { STORES } from './processes.ts';
import { output, run, step } from './runtime.ts';

export const SOCKET = ['--use-uds', '--unix-socket', PC_SOCKET];

export function pc(args: ReadonlyArray<string>): Promise<void> {
  return run('process-compose', [...args, ...SOCKET], { cwd: RUN });
}

export async function list(): Promise<ReadonlyArray<PcProcess>> {
  const text = await output('process-compose', ['process', 'list', '-o', 'json', ...SOCKET], { cwd: RUN });
  const decoded = fromJson(PcProcesses).safeParse(text);
  if (!decoded.success) throw new Error(`process-compose's list: ${decoded.error.message}`);

  return decoded.data;
}

export async function running(): Promise<Set<string>> {
  return new Set((await list()).filter((row) => row.is_running).map((row) => row.name));
}

// Stops those of `names` that run, and waits until they have. process-compose fails to stop a process that isn't
// running (a failed apply leaves apps stopped), and `process stop` returns while they still terminate.
export async function stopRunning(names: ReadonlyArray<string>): Promise<void> {
  const now = await running();
  const stop = names.filter((name) => now.has(name));
  if (stop.length) await step(`stop ${stop.join(' ')}`, () => pc(['process', 'stop', ...stop]));
  let left: Array<string> = [];
  await poll(
    async () => {
      left = (await list())
        .filter((row) => names.includes(row.name) && (row.is_running || row.status === 'Terminating'))
        .map((row) => row.name);

      return !left.length;
    },
    { timeoutMs: 180_000, what: () => `still running after the stop: ${left.join(' ')}` }
  );
}

// A process waiting for an app that was stopped before it got healthy (stripe waits for the API) is Skipped, and
// stays so when that app restarts.
export async function startSkipped(): Promise<void> {
  const skipped = (await list()).filter((row) => row.status === 'Skipped').map((row) => row.name);
  if (skipped.length)
    await step(`start ${skipped.join(' ')}`, async () => {
      for (const name of skipped) await pc(['process', 'start', name]);
    });
}

// Every store answers its readiness probe and `migrate` has run: what the apps, and an apply, need first.
export async function storesReady(): Promise<boolean> {
  const rows = await list();
  const ready = STORES.every((name) => rows.find((row) => row.name === name)?.is_ready === 'Ready');

  return ready && rows.find((row) => row.name === 'migrate')?.status === 'Completed';
}
