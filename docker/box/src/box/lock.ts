// One bake or apply at a time, and the one answer to "is one running" (`box state` and `doctor`, the host's busy
// check, CI stopping an older push's apply). Started detached (`setsid`, see `detached` in src/shared/names.ts), its
// pid is also its process group, so CI stops all of it. A lock whose process is gone (a killed apply) is taken over;
// `box start` clears one a snapshot kept, since PIDs start over.

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

function taken(holder: LockHolder | null): Error {
  return new Error(
    `another ${holder?.command ?? 'bake or apply'} is running (pid ${holder?.pid}); wait for it to finish`
  );
}

function take(command: string): boolean {
  try {
    fs.writeFileSync(LOCK, JSON.stringify({ pid: process.pid, command, at: new Date().toISOString() }), { flag: 'wx' });

    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'EEXIST') return false;
    throw error;
  }
}

function acquire(command: string): void {
  fs.mkdirSync(RUN, { recursive: true });
  if (take(command)) return;
  const holder = lockHolder();
  if (holder) throw taken(holder);
  log('taking over the lock of a bake or apply that is gone');
  fs.rmSync(LOCK, { force: true });
  // Only a bake or apply runs git in the checkout, so an index.lock is one that the dead one left.
  fs.rmSync(`${REPO}/.git/index.lock`, { force: true });
  // Another one that found the same dead holder may have taken the lock in between.
  if (!take(command)) throw taken(lockHolder());
}

export async function withLock<T>(command: 'bake' | 'apply', work: () => Promise<T>): Promise<T> {
  acquire(command);
  try {
    return await work();
  } finally {
    fs.rmSync(LOCK, { force: true });
  }
}
