import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { listenDir } from './state';

/**
 * The listener that runs in a terminal (`listen <host> --foreground`), by its process: `listen stop`, and listening
 * turned on again, stop it first, so two never hold the same lease and answer the same messages.
 */
export interface ForegroundStore {
  /** The process of a listener still running in a terminal on this computer, other than this one, or null. */
  running(): number | null;
  /** This process runs one from now on. */
  claim(pid: number): void;
  /** It doesn't any more. Another process's claim is left alone. */
  release(pid: number): void;
}

function claimPath(): string {
  return join(listenDir(), 'foreground.json');
}

function claimed(): number | null {
  try {
    const { pid } = JSON.parse(readFileSync(claimPath(), 'utf8')) as { pid?: unknown };

    return typeof pid === 'number' && Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);

    return true;
  } catch {
    return false;
  }
}

/**
 * Whether `pid` is a listener running in a terminal: alive, and started as one. One that ended without saying so
 * leaves its number behind, and another process may get that number later: such a process is never stopped.
 */
function isForegroundListener(pid: number): boolean {
  if (!isAlive(pid)) {
    return false;
  }

  const ran = spawnSync('ps', ['-o', 'command=', '-p', String(pid)], { encoding: 'utf8', timeout: 5000 });
  const words = ran.status === 0 ? ran.stdout.trim().split(/\s+/) : [];

  return words.includes('listen') && words.includes('--foreground');
}

export const fileForeground: ForegroundStore = {
  running() {
    const pid = claimed();

    return pid !== null && pid !== process.pid && isForegroundListener(pid) ? pid : null;
  },
  claim(pid) {
    mkdirSync(listenDir(), { recursive: true });
    writeFileSync(claimPath(), `${JSON.stringify({ pid })}\n`, { mode: 0o600 });
  },
  release(pid) {
    if (claimed() === pid) {
      rmSync(claimPath(), { force: true });
    }
  },
};

/**
 * Stops a listener running in a terminal here, if there is one, and waits for it to end: it finishes its run and
 * lets go of the lease first. False when there was none.
 */
export async function stopForeground(store: ForegroundStore, timeoutMs = 10_000): Promise<boolean> {
  const pid = store.running();
  if (pid === null) {
    return false;
  }

  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    return false;
  }

  const deadline = Date.now() + timeoutMs;
  while (isAlive(pid) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  store.release(pid);

  return true;
}
