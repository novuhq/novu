// One bake or apply at a time, and the one answer to "is one running" (`box state` and `doctor`, the host's busy
// check, CI stopping an older push's apply). Started detached (`setsid`, see `detached` in src/shared/names.ts), its
// pid is also its process group, so CI stops all of it. A lock whose process is gone (a killed apply) is taken over;
// `box start` clears one a snapshot kept, since PIDs start over.

import fs from 'node:fs';
import { Effect, Schema } from 'effect';
import { LockHolder } from '../shared/contracts.ts';
import { LockTaken } from './errors.ts';
import { LOCK, REPO, RUN } from './paths.ts';
import { log } from './runtime.ts';

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
  let holder: LockHolder | null = null;
  try {
    holder = Schema.decodeUnknownSync(Schema.fromJsonString(LockHolder))(fs.readFileSync(LOCK, 'utf8'));
  } catch {}

  return holder?.pid && isAlive(holder.pid) ? holder : null;
}

const taken = (holder: LockHolder | null) =>
  new LockTaken({
    message: `another ${holder?.command ?? 'bake or apply'} is running (pid ${holder?.pid}); wait for it to finish`,
  });

const take = (command: string) =>
  fs.writeFileSync(LOCK, JSON.stringify({ pid: process.pid, command, at: new Date().toISOString() }), { flag: 'wx' });

const isExists = (error: unknown) => (error as NodeJS.ErrnoException).code === 'EEXIST';

const acquire = (command: string) =>
  Effect.try({
    try: () => {
      fs.mkdirSync(RUN, { recursive: true });
      try {
        take(command);
      } catch (error) {
        if (!isExists(error)) throw error;
        const holder = lockHolder();
        if (holder) throw taken(holder);
        log('taking over the lock of a bake or apply that is gone');
        fs.rmSync(LOCK, { force: true });
        // Only a bake or apply runs git in the checkout, so an index.lock is one that the dead one left.
        fs.rmSync(`${REPO}/.git/index.lock`, { force: true });
        // Another one that found the same dead holder may have taken the lock in between.
        try {
          take(command);
        } catch (retryError) {
          if (!isExists(retryError)) throw retryError;
          throw taken(lockHolder());
        }
      }
    },
    catch: (error) => (error instanceof LockTaken ? error : new LockTaken({ message: `can't take ${LOCK}: ${error}` })),
  });

// Holds the lock for the rest of the scope.
export const holdLock = (command: 'bake' | 'apply') =>
  Effect.acquireRelease(acquire(command), () => Effect.sync(() => fs.rmSync(LOCK, { force: true })));
