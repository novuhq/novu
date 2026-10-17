
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

export function lockHolder(): LockHolder | null {
  const holder = fs.existsSync(LOCK) ? fromJson(LockHolder).safeParse(fs.readFileSync(LOCK, 'utf8')).data : undefined;

  return holder?.pid && isAlive(holder.pid) ? holder : null;
}

const TAKEOVER = `${LOCK}.takeover`;
const TAKEOVER_STALE_MS = 30_000;
const DEAD_HOLDERS_GIT_LOCK = `${REPO}/.git/index.lock`;

function taken(holder: LockHolder | null): Error {
  return new Error(
    holder
      ? `another ${holder.command} is running (pid ${holder.pid}); wait for it to finish`
      : 'another bake or apply is taking the lock over; try again'
  );
}

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
    const holder = lockHolder();
    if (holder) throw taken(holder);
    log('taking over the lock of a bake or apply that is gone');
    fs.rmSync(LOCK, { force: true });
    fs.rmSync(DEAD_HOLDERS_GIT_LOCK, { force: true });
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
