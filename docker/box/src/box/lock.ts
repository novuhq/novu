// One bake or apply at a time, and the one answer to "is one running" (`box state` and `doctor`, the host's busy
// check, CI stopping an older push's apply, `stop-apply`). A lock whose process is gone (a killed apply) is taken
// over; `box start` clears one a snapshot kept, since PIDs start over.

import fs from 'node:fs';
import { log } from '../node/main.ts';
import { fromJson, LockHolder } from '../shared/contracts.ts';
import { LOCK, REPO, RUN } from './paths.ts';

export function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);

    return true;
  } catch {
    return false;
  }
}

// The bake or apply that holds the lock, while its process lives.
export function lockHolder(): LockHolder | null {
  const holder = fs.existsSync(LOCK) ? fromJson(LockHolder).safeParse(fs.readFileSync(LOCK, 'utf8')).data : undefined;

  return holder?.pid && isAlive(holder.pid) ? holder : null;
}

// One taker of a dead holder's lock at a time: two that found the same dead holder could otherwise each remove the
// lock, the second removing the first's new one. Held for microseconds, so one this old was left by a dead taker.
const TAKEOVER = `${LOCK}.takeover`;
const TAKEOVER_STALE_MS = 30_000;

function taken(holder: LockHolder | null): Error {
  return new Error(
    holder
      ? `another ${holder.command} is running (pid ${holder.pid}); wait for it to finish`
      : 'another bake or apply is taking the lock over; try again'
  );
}

// Written whole to a file of its own, then linked into place, so `file` is never there half written.
function take(file: string, command: string): boolean {
  const own = `${file}.${process.pid}`;
  fs.writeFileSync(own, JSON.stringify({ pid: process.pid, command, at: new Date().toISOString() }));
  try {
    fs.linkSync(own, file);

    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'EEXIST') return false;
    throw error;
  } finally {
    fs.rmSync(own, { force: true });
  }
}

function takeTakeover(command: string): boolean {
  if (take(TAKEOVER, command)) return true;
  const age = Date.now() - (fs.statSync(TAKEOVER, { throwIfNoEntry: false })?.mtimeMs ?? Date.now());
  if (age < TAKEOVER_STALE_MS) return false;
  fs.rmSync(TAKEOVER, { force: true });

  return take(TAKEOVER, command);
}

function acquire(command: string): void {
  fs.mkdirSync(RUN, { recursive: true });
  if (take(LOCK, command)) return;
  if (lockHolder()) throw taken(lockHolder());
  if (!takeTakeover(command)) throw taken(null);
  try {
    // Looked at again, now that no other taker can remove it.
    const holder = lockHolder();
    if (holder) throw taken(holder);
    log('taking over the lock of a bake or apply that is gone');
    fs.rmSync(LOCK, { force: true });
    // Only a bake or apply runs git in the checkout, so an index.lock is one that the dead one left.
    fs.rmSync(`${REPO}/.git/index.lock`, { force: true });
    // A plain `take` may have won it in between.
    if (!take(LOCK, command)) throw taken(lockHolder());
  } finally {
    fs.rmSync(TAKEOVER, { force: true });
  }
}

export async function withLock<T>(command: 'bake' | 'apply', work: () => Promise<T>): Promise<T> {
  acquire(command);
  try {
    return await work();
  } finally {
    fs.rmSync(LOCK, { force: true });
  }
}
