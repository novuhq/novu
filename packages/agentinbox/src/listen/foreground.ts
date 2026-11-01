import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { listenDir } from './state';

/**
 * How long a listener in a terminal may take to stop: it stops its host's run first (Claude Code gets up to 20
 * seconds), closes the host (up to 10 more), and lets go of the lease.
 */
const SHUTDOWN_MS = 45_000;

/** How long a listener that was killed may take to be gone. */
const KILLED_MS = 5_000;

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
 * lets go of the lease first. One still running after `timeoutMs` is killed: left to finish later, it would let
 * go of the next listener's lease, which is for the same computer and host, and write over its state. False when
 * there was none.
 */
export async function stopForeground(store: ForegroundStore, timeoutMs = SHUTDOWN_MS): Promise<boolean> {
  const pid = store.running();
  if (pid === null) {
    return false;
  }

  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    return false;
  }

  // Still the listener it was: a process that ended meanwhile leaves its number to whatever starts next.
  if (!(await ended(pid, timeoutMs)) && store.running() === pid) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // It ended just now.
    }
    await ended(pid, KILLED_MS);
  }
  store.release(pid);

  return true;
}

/** Waits up to `ms` for the process to end; whether it did. */
async function ended(pid: number, ms: number): Promise<boolean> {
  const deadline = Date.now() + ms;
  while (isAlive(pid)) {
    if (Date.now() >= deadline) {
      return false;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return true;
}
